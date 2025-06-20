// controllers/galleryController.js
const knex = require('../db/knex');
const { encryptId, decryptId } = require('../models/encryption.js');
const { processAndUploadImage, uploadVideo, generateSlug, useLocalStorage } = require('../models/googleCloudStorage');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const crypto = require('crypto');
// Initialize storage with Application Default Credentials
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
});
const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET_NAME);
const NodeCache = require('node-cache');

const ONE_HOUR_MS = 60 * 60 * 1000;

const signedUrlCache = new NodeCache({ 
  stdTTL: 3600,           // Default TTL of 1 hour
  checkperiod: 600,       // Check for expired keys every 10 minutes
  maxKeys: 100000,        // 100K URLs ≈ 100MB-200MB memory usage
  useClones: false        // Disable cloning for better performance and less memory
});

/**
 * for getting cached or fresh signed URLs
 */
async function getCachedSignedUrl(file, options = {}) {
  const expiresInMs = options.expirationTimeMs || 5 * 60 * 1000; // Default 5 minutes, but can be overridden
  const cacheKey = `signedUrl:${file.name}:${options.action || 'read'}:${expiresInMs}`;
  
  // Try to get from cache first
  let signedUrl = signedUrlCache.get(cacheKey);
  
  if (signedUrl) {
    return signedUrl;
  }
  
  // If not in cache, generate a new signed URL
  const defaultOptions = {
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresInMs
  };
  
  const [freshSignedUrl] = await file.getSignedUrl({
    ...defaultOptions,
    ...options,
    expires: Date.now() + expiresInMs
  });
  
  // Calculate TTL (make it expire slightly before the actual signed URL)
  // For 1-hour URLs, we can cache for 55 minutes to be safe
  const ttl = Math.floor(expiresInMs / 1000) - 300; // 5 minutes less than total expiration
  
  // Store in cache
  signedUrlCache.set(cacheKey, freshSignedUrl, ttl > 0 ? ttl : 60);
  
  return freshSignedUrl;
}

/**
 * Generate a secure token for media access
 */
function generateSecureToken(path, expiry) {
  const secretKey = process.env.MEDIA_SECRET_KEY || 'default-media-secret-key';
  const data = `${path}:${expiry}`;
  return crypto.createHmac('sha256', secretKey).update(data).digest('hex');
}

/**
 * Generate a media proxy URL for a given media path
 * @param {string} originalUrl - Original media URL
 * @param {number} expiryMinutes - Expiry time in minutes
 * @param {boolean} isPrivate - Whether this is a private media item
 */
function generateMediaProxyUrl(originalUrl, expiryMinutes = 30, isPrivate = false) {
  if (!originalUrl || useLocalStorage()) {
    return originalUrl;
  }
  
  try {
    // Extract the path from the GCS URL
    const urlObj = new URL(originalUrl);
    const mediaPath = urlObj.pathname;
    
    // Calculate expiry timestamp
    const expiryTimestamp = Math.floor(Date.now() / 1000) + (expiryMinutes * 60);
    
    // Generate secure token
    const token = generateSecureToken(mediaPath, expiryTimestamp);
    
    // Create proxy URL - different endpoint for private media
    const endpoint = isPrivate ? '/api/media/private/view' : '/api/media/view';
    return `${endpoint}?path=${encodeURIComponent(mediaPath)}&expires=${expiryTimestamp}&token=${token}&expiryMinutes=${expiryMinutes}`;
  } catch (err) {
    console.error('Error generating media proxy URL:', err);
    return originalUrl;
  }
}

/**
 * Extract filename from a GCS URL
 */
function getFilenameFromUrl(url) {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    // The path will be like /bucket-name/path/to/file.jpg
    // We want everything after the bucket name
    const pathParts = urlObj.pathname.split('/');
    return pathParts.slice(2).join('/');
  } catch (err) {
    console.error('Error parsing URL:', err);
    return null;
  }
}

/**
 * Process a gallery item to add media proxy URLs
 * @param {Object} item - Gallery item from database
 * @param {boolean} includePrivate - Whether to include private media URLs
 */
async function processGalleryItemUrls(item, includePrivate = false) {
  try {
    const result = { ...item };
    const isPrivate = item.is_private === true;
    
    // Use media proxy URLs for all media
    if (item.type === 'image') {
      if (item.image_small) {
        result.image_small = generateMediaProxyUrl(item.image_small, 30, isPrivate);
      }
      if (item.image_medium) {
        result.image_medium = generateMediaProxyUrl(item.image_medium, 30, isPrivate);
      }
      if (item.image_high) {
        result.image_high = generateMediaProxyUrl(item.image_high, 30, isPrivate);
      }
      if (item.image_original) {
        result.image_original = generateMediaProxyUrl(item.image_original, 5, isPrivate); // Shorter expiry for original
      }
    } else if (item.type === 'video') {
      if (item.video_link) {
        // Only include video_link if it's public or if we're explicitly including private content
        if (!isPrivate || includePrivate) {
          result.video_link = generateMediaProxyUrl(item.video_link, 60, isPrivate); // Longer expiry for videos
        } else {
          // For private videos that shouldn't be included, set to null or a placeholder
          result.video_link = null;
          result.requires_authentication = true;
        }
      }
    }
    
    // Store original URLs in separate properties for admin use
    if (!useLocalStorage()) {
      if (item.type === 'image') {
        result._original_image_urls = {
          small: item.image_small,
          medium: item.image_medium,
          high: item.image_high,
          original: item.image_original
        };
      } else if (item.type === 'video') {
        result._original_video_url = item.video_link;
      }
    }
    
    // Encrypt ID
    result.id = encryptId(item.id);
    
    return result;
  } catch (err) {
    console.error('Error processing gallery item URLs:', err);
    return { ...item, id: encryptId(item.id) };
  }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Media_Gallery:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         title:
 *           type: string
 *         slug:
 *           type: string
 *         type:
 *           type: string
 *           enum: [image, video]
 *         tag:
 *           type: string
 *         is_private:
 *           type: boolean
 *           description: Whether this media requires authentication to access
 *         image_small:
 *           type: string
 *         image_medium:
 *           type: string
 *         image_high:
 *           type: string
 *         image_original:
 *           type: string
 *         video_link:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */
module.exports = {
    /**
     * @swagger
     * /api/gallery/upload:
     *   post:
     *     summary: Upload images or videos to gallery
     *     tags: [Gallery]
     *     security:
     *       - cookieAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               files:
     *                 type: array
     *                 items:
     *                   type: string
     *                   format: binary
     *               title:
     *                 type: string
     *               tag:
     *                 type: string
     *               is_private:
     *                 type: boolean
     *                 description: Set to true for private media (requires authentication)
     *     responses:
     *       201:
     *         description: Media uploaded successfully
     */
    uploadMedia: async (req, res) => {
        try {
        const { title, tag } = req.body;
        // Parse is_private as boolean from form data
        const isPrivate = req.body.is_private === 'true' || req.body.is_private === true;
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }
        
        const results = [];
        
        for (const file of req.files) {
            let mediaData = {
            title: title || file.originalname,
            slug: generateSlug(title || file.originalname),
            tag: tag || null,
            is_private: isPrivate,
            updated_at: new Date()
            };
            
            // Check if file is video or image
            if (file.mimetype.startsWith('video/')) {
            mediaData.type = 'video';
            const videoData = await uploadVideo(file);
            mediaData = { ...mediaData, ...videoData };
            } else if (file.mimetype.startsWith('image/')) {
            mediaData.type = 'image';
            const imageData = await processAndUploadImage(file);
            mediaData = { ...mediaData, ...imageData };
            } else {
            continue; // Skip unsupported files
            }
            
            // Save to database
            const [gallery] = await knex('media_gallery')
            .insert(mediaData)
            .returning('*');
            
            // Process URLs and encrypt ID - include private content since admin is uploading
            const processedGallery = await processGalleryItemUrls(gallery, true);
            
            results.push(processedGallery);
        }
        
        res.status(201).json({ 
            message: 'Media uploaded successfully', 
            data: results 
        });
        } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ message: err.message });
        }
    },
  
    /**
     * @swagger
     * /api/gallery:
     *   get:
     *     summary: Get public gallery items (no authentication required)
     *     tags: [Gallery]
     *     parameters:
     *       - in: query
     *         name: type
     *         schema:
     *           type: string
     *           enum: [image, video, all]
     *         description: Filter by media type
     *       - in: query
     *         name: tag
     *         schema:
     *           type: string
     *         description: Filter by tag
     *     responses:
     *       200:
     *         description: List of public gallery items
     */
    getAllPublicMedia: async (req, res) => {
        try {
            const { type = 'all', tag } = req.query;
            
            let query = knex('media_gallery')
                .where('is_private', false) // Only get public media
                .whereNull('deleted_at');
            
            if (type !== 'all') {
                query = query.where('type', type);
            }
            
            if (tag) {
                query = query.where('tag', tag);
            }
            
            const galleries = await query.orderBy('created_at', 'desc');
            
            // Process gallery items to add signed URLs
            const results = await Promise.all(galleries.map(async (item) => {
                // Process for public access (includePrivate = false)
                return await processGalleryItemUrls(item, false);
            }));
            
            res.status(200).json({ 
                message: 'Public gallery items retrieved successfully', 
                results
            });
        } catch (err) {
            console.error('Error getting public gallery items:', err);
            res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/gallery/private:
     *   get:
     *     summary: Get all gallery items including private ones (requires authentication)
     *     tags: [Gallery]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: query
     *         name: type
     *         schema:
     *           type: string
     *           enum: [image, video, all]
     *         description: Filter by media type
     *       - in: query
     *         name: tag
     *         schema:
     *           type: string
     *         description: Filter by tag
     *       - in: query
     *         name: is_private
     *         schema:
     *           type: boolean
     *         description: Filter by private status
     *     responses:
     *       200:
     *         description: List of all gallery items including private ones
     *       401:
     *         description: Unauthorized - authentication required
     */
    getAllMedia: async (req, res) => {
        try {
            const { type = 'all', tag, is_private } = req.query;
            
            let query = knex('media_gallery')
                .whereNull('deleted_at');
            
            if (type !== 'all') {
                query = query.where('type', type);
            }
            
            if (tag) {
                query = query.where('tag', tag);
            }
            
            // Filter by private status if specified
            if (is_private !== undefined) {
                const privateStatus = is_private === 'true' || is_private === true;
                query = query.where('is_private', privateStatus);
            }
            
            const galleries = await query.orderBy('created_at', 'desc');
            
            // Process gallery items to add signed URLs - include private content since user is authenticated
            const results = await Promise.all(galleries.map(async (item) => {
                return await processGalleryItemUrls(item, true);
            }));
            
            res.status(200).json({ 
                message: 'Gallery items retrieved successfully', 
                results
            });
        } catch (err) {
            console.error('Error getting gallery items:', err);
            res.status(500).json({ message: err.message });
        }
    },
  
    /**
     * @swagger
     * /api/gallery/{id}:
     *   get:
     *     summary: Get public gallery item by ID (no authentication required)
     *     tags: [Gallery]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Gallery item ID
     *     responses:
     *       200:
     *         description: Gallery item details
     *       404:
     *         description: Gallery item not found or requires authentication
     */
    getPublicMediaById: async (req, res) => {
        try {
            const id = decryptId(req.params.id);
            
            const gallery = await knex('media_gallery')
                .where({ id })
                .whereNull('deleted_at')
                .first();
                
            if (!gallery) {
                return res.status(404).json({ message: 'Gallery item not found' });
            }
            
            // If it's private, don't provide details
            if (gallery.is_private) {
                return res.status(404).json({ 
                    message: 'Gallery item requires authentication', 
                    requires_authentication: true 
                });
            }
            
            // Process the item to add media proxy URLs
            const result = await processGalleryItemUrls(gallery, false);
            
            res.status(200).json({ 
                message: 'Gallery item retrieved successfully', 
                data: result
            });
        } catch (err) {
            console.error('Error getting gallery item by ID:', err);
            res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/gallery/private/{id}:
     *   get:
     *     summary: Get gallery item by ID including private content (requires authentication)
     *     tags: [Gallery]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Gallery item ID
     *     responses:
     *       200:
     *         description: Gallery item details including private content
     *       401:
     *         description: Unauthorized - authentication required
     *       404: 
     *         description: Gallery item not found
     */
    getMediaById: async (req, res) => {
        try {
            const id = decryptId(req.params.id);
            
            const gallery = await knex('media_gallery')
                .where({ id })
                .whereNull('deleted_at')
                .first();
                
            if (!gallery) {
                return res.status(404).json({ message: 'Gallery item not found' });
            }
            
            // Process the item to add media proxy URLs - include private content since user is authenticated
            const result = await processGalleryItemUrls(gallery, true);
            
            res.status(200).json({ 
                message: 'Gallery item retrieved successfully', 
                data: result
            });
        } catch (err) {
            console.error('Error getting gallery item by ID:', err);
            res.status(500).json({ message: err.message });
        }
    },
    
    /**
     * @swagger
     * /api/gallery/slug/{slug}:
     *   get:
     *     summary: Get public gallery item by slug (no authentication required)
     *     tags: [Gallery]
     *     parameters:
     *       - in: path
     *         name: slug
     *         required: true
     *         schema:
     *           type: string
     *         description: Gallery item slug
     *     responses:
     *       200:
     *         description: Public gallery item details
     *       404:
     *         description: Gallery item not found or requires authentication
     */
    getPublicMediaBySlug: async (req, res) => {
        try {
            const { slug } = req.params;
            
            const gallery = await knex('media_gallery')
                .where({ slug })
                .whereNull('deleted_at')
                .first();
                
            if (!gallery) {
                return res.status(404).json({ message: 'Gallery item not found' });
            }
            
            // If it's private, don't provide details
            if (gallery.is_private) {
                return res.status(404).json({ 
                    message: 'Gallery item requires authentication', 
                    requires_authentication: true 
                });
            }
            
            // Process the item to add media proxy URLs
            const result = await processGalleryItemUrls(gallery, false);
            
            res.status(200).json({ 
                message: 'Gallery item retrieved successfully', 
                });
        } catch (err) {
            console.error('Error getting gallery item by slug:', err);
            res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/gallery/private/slug/{slug}:
     *   get:
     *     summary: Get gallery item by slug including private content (requires authentication)
     *     tags: [Gallery]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: slug
     *         required: true
     *         schema:
     *           type: string
     *         description: Gallery item slug
     *     responses:
     *       200:
     *         description: Gallery item details including private content
     *       401:
     *         description: Unauthorized - authentication required
     *       404:
     *         description: Gallery item not found
     */
    getMediaBySlug: async (req, res) => {
        try {
            const { slug } = req.params;
            
            const gallery = await knex('media_gallery')
                .where({ slug })
                .whereNull('deleted_at')
                .first();
                
            if (!gallery) {
                return res.status(404).json({ message: 'Gallery item not found' });
            }
            
            // Process the item to add media proxy URLs - include private content since user is authenticated
            const result = await processGalleryItemUrls(gallery, true);
            
            res.status(200).json({ 
                message: 'Gallery item retrieved successfully', 
                });
        } catch (err) {
            console.error('Error getting gallery item by slug:', err);
            res.status(500).json({ message: err.message });
        }
    },
    
    /**
     * @swagger
     * /api/gallery/{id}:
     *   put:
     *     summary: Update gallery item
     *     tags: [Gallery]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Gallery item ID
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               title:
     *                 type: string
     *               tag:
     *                 type: string
     *               is_private:
     *                 type: boolean
     *                 description: Set to true for private media (requires authentication)
     *     responses:
     *       200:
     *         description: Gallery item updated successfully
     */
    updateMedia: async (req, res) => {
        try {
            const id = decryptId(req.params.id);
            const { title, tag, is_private } = req.body;
            
            // Check if gallery item exists
            const gallery = await knex('media_gallery')
                .where({ id })
                .whereNull('deleted_at')
                .first();
                
            if (!gallery) {
                return res.status(404).json({ message: 'Gallery item not found' });
            }
            
            const updateData = {
                updated_at: new Date()
            };
            
            if (title) {
                updateData.title = title;
                updateData.slug = generateSlug(title);
            }
            
            if (tag !== undefined) {
                updateData.tag = tag;
            }
            
            if (is_private !== undefined) {
                updateData.is_private = is_private === true;
            }
            
            // Update gallery item
            const [updatedGallery] = await knex('media_gallery')
                .where({ id })
                .update(updateData)
                .returning('*');
            
            // Process the updated item to add media proxy URLs - include private since admin is updating
            const result = await processGalleryItemUrls(updatedGallery, true);
            
            res.status(200).json({ 
                message: 'Gallery item updated successfully', 
                data: result 
            });
        } catch (err) {
            console.error('Error updating gallery item:', err);
            res.status(500).json({ message: err.message });
        }
    },
    
    /**
     * @swagger
     * /api/gallery/{id}:
     *   delete:
     *     summary: Delete gallery item
     *     tags: [Gallery]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Gallery item ID
     *     responses:
     *       200:
     *         description: Gallery item deleted successfully
     */
    deleteMedia: async (req, res) => {
        try {
            const id = decryptId(req.params.id);
            
            // Check if gallery item exists
            const gallery = await knex('media_gallery')
                .where({ id })
                .whereNull('deleted_at')
                .first();
                
            if (!gallery) {
                return res.status(404).json({ message: 'Gallery item not found' });
            }
            
            // Optional: Delete the files from Google Cloud Storage
            // This is commented out because you might want to keep the files
            /*
            if (gallery.type === 'image') {
                if (gallery.image_small) await bucket.file(getFilenameFromUrl(gallery.image_small)).delete().catch(console.error);
                if (gallery.image_medium) await bucket.file(getFilenameFromUrl(gallery.image_medium)).delete().catch(console.error);
                if (gallery.image_high) await bucket.file(getFilenameFromUrl(gallery.image_high)).delete().catch(console.error);
                if (gallery.image_original) await bucket.file(getFilenameFromUrl(gallery.image_original)).delete().catch(console.error);
            } else if (gallery.type === 'video') {
                if (gallery.video_link) await bucket.file(getFilenameFromUrl(gallery.video_link)).delete().catch(console.error);
            }
            */
            
            // Delete from database
            await knex('media_gallery')
                .where({ id })
                .del();
            
            res.status(200).json({ 
                message: 'Gallery item deleted successfully'
            });
        } catch (err) {
            console.error('Error deleting gallery item:', err);
            res.status(500).json({ message: err.message });
        }
    },
    
    /**
     * @swagger
     * /api/gallery/stream/{id}:
     *   get: 
     *     summary: Stream video from gallery (authentication required for private videos)
     *     tags: [Gallery]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Gallery video ID
     *     responses:
     *       302:
     *         description: Redirect to media proxy URL for video
     *       401:
     *         description: Unauthorized - authentication required for private videos
     *       404:
     *         description: Video not found
     */
    streamVideo: async (req, res) => {
        try {
            const id = decryptId(req.params.id);
            
            // Get the video from database
            const gallery = await knex('media_gallery')
                .where({ id, type: 'video' })
                .whereNull('deleted_at')
                .first();
                
            if (!gallery || !gallery.video_link) {
                return res.status(404).json({ message: 'Video not found' });
            }
            
            // Check if this is a private video
            const isPrivate = gallery.is_private === true;
            
            // If it's private, check authentication
            if (isPrivate && !req.user) {
                return res.status(401).json({ 
                    message: 'Authentication required to access this video',
                    requires_authentication: true
                });
            }
            
            // Generate a media proxy URL with longer expiration for video streaming (60 minutes)
            const proxyUrl = generateMediaProxyUrl(gallery.video_link, 60, isPrivate);
            
            // Redirect to the proxy URL
            res.redirect(proxyUrl);
        } catch (err) {
            console.error('Video streaming error:', err);
            res.status(500).json({ message: 'Error streaming video' });
        }
    },
    
    /**
     * @swagger
     * /api/media/view:
     *   get:
     *     summary: Media proxy to serve public images and videos securely
     *     tags: [Gallery]
     *     parameters:
     *       - in: query
     *         name: path
     *         required: true
     *         schema:
     *           type: string
     *         description: Media path
     *       - in: query
     *         name: expires
     *         required: true
     *         schema:
     *           type: integer
     *         description: Expiry timestamp
     *       - in: query
     *         name: token
     *         required: true
     *         schema:
     *           type: string
     *         description: Security token
     *     responses:
     *       200:
     *         description: Media file
     *       302:
     *         description: Redirect to signed URL
     */
    mediaProxy: async (req, res) => {
        try {
            const { path: mediaPath, expires, token } = req.query;
            
            if (!mediaPath || !expires || !token) {
                return res.status(400).json({ message: 'Missing required parameters' });
            }
            
            // Verify expiry
            const expiryTimestamp = parseInt(expires, 10);
            if (isNaN(expiryTimestamp) || Date.now() / 1000 > expiryTimestamp) {
                return res.status(403).json({ message: 'URL has expired' });
            }
            
            // Verify token
            const expectedToken = generateSecureToken(mediaPath, expiryTimestamp);
            if (token !== expectedToken) {
                return res.status(403).json({ message: 'Invalid token' });
            }
            
            // Extract bucket name and filename
            const pathParts = mediaPath.split('/');
            const bucketName = pathParts[1];
            const filename = pathParts.slice(2).join('/');
            
            if (!filename) {
                return res.status(400).json({ message: 'Invalid media path' });
            }
            
            // Get file from bucket
            const file = bucket.file(filename);
            
            // Check if file exists
            const [exists] = await file.exists();
            if (!exists) {
                return res.status(404).json({ message: 'Media not found' });
            }
            
            // Generate a short-lived signed URL (5 minutes)
            // const [signedUrl] = await file.getSignedUrl({
            //     version: 'v4',
            //     action: 'read',
            //     expires: Date.now() + (5 * 60 * 1000) // 5 minutes
            // });
            const signedUrl = await getCachedSignedUrl(file, {
                version: 'v4',
                action: 'read',
                expires: Date.now() + (ONE_HOUR_MS) // 5 minutes
            });
            
            // Get content type to set appropriate headers
            const [metadata] = await file.getMetadata();
            const contentType = metadata.contentType;
            
            if (contentType && contentType.startsWith('video/')) {
                // For videos, redirect to the signed URL
                return res.redirect(signedUrl);
            }
            
            // For images, proxy the content
            const response = await fetch(signedUrl);
            if (!response.ok) {
                return res.status(response.status).json({ message: 'Error fetching media' });
            }
            
            // Get the image data
            const imageBuffer = await response.arrayBuffer();
            
            // Set appropriate headers
            res.set('Content-Type', contentType || 'application/octet-stream');
            res.set('Cache-Control', 'public, max-age=300'); // 5 minutes cache
            
            // Send the image data
            res.send(Buffer.from(imageBuffer));
        } catch (err) {
            console.error('Media proxy error:', err);
            res.status(500).json({ message: 'Error serving media' });
        }
    },
    
    /**
     * @swagger
     * /api/media/private/view:
     *   get:
     *     summary: Media proxy to serve private images and videos securely (requires authentication)
     *     tags: [Gallery]
     *     security:
     *       - cookieAuth: []
     *     parameters:
     *       - in: query
     *         name: path
     *         required: true
     *         schema:
     *           type: string
     *         description: Media path
     *       - in: query
     *         name: expires
     *         required: true
     *         schema:
     *           type: integer
     *         description: Expiry timestamp
     *       - in: query
     *         name: token
     *         required: true
     *         schema:
     *           type: string
     *         description: Security token
     *     responses:
     *       200:
     *         description: Media file
     *       302:
     *         description: Redirect to signed URL
     *       401:
     *         description: Unauthorized - authentication required
     */
    privateMediaProxy: async (req, res) => {
        try {
            // Check if user is authenticated
            if (!req.user) {
                return res.status(401).json({ 
                    message: 'Authentication required to access private media',
                    requires_authentication: true
                });
            }
            
            const { path: mediaPath, expires, token } = req.query;
            
            if (!mediaPath || !expires || !token) {
                return res.status(400).json({ message: 'Missing required parameters' });
            }
            
            // Verify expiry
            const expiryTimestamp = parseInt(expires, 10);
            if (isNaN(expiryTimestamp) || Date.now() / 1000 > expiryTimestamp) {
                return res.status(403).json({ message: 'URL has expired' });
            }
            
            // Verify token
            const expectedToken = generateSecureToken(mediaPath, expiryTimestamp);
            if (token !== expectedToken) {
                return res.status(403).json({ message: 'Invalid token' });
            }
            
            // Extract bucket name and filename
            const pathParts = mediaPath.split('/');
            const bucketName = pathParts[1];
            const filename = pathParts.slice(2).join('/');
            
            if (!filename) {
                return res.status(400).json({ message: 'Invalid media path' });
            }
            
            // Get file from bucket
            const file = bucket.file(filename);
            
            // Check if file exists
            const [exists] = await file.exists();
            if (!exists) {
                return res.status(404).json({ message: 'Media not found' });
            }
            
            // Generate a short-lived signed URL (5 minutes)
            // const [signedUrl] = await file.getSignedUrl({
            //     version: 'v4',
            //     action: 'read',
            //     expires: Date.now() + (5 * 60 * 1000) // 5 minutes
            // });
            const signedUrl = await getCachedSignedUrl(file, {
                version: 'v4',
                action: 'read',
                expires: Date.now() + (ONE_HOUR_MS) // 5 minutes
            });
            
            // Get content type to set appropriate headers
            const [metadata] = await file.getMetadata();
            const contentType = metadata.contentType;
            
            if (contentType && contentType.startsWith('video/')) {
                // For videos, redirect to the signed URL
                return res.redirect(signedUrl);
            }
            
            // For images, proxy the content
            const response = await fetch(signedUrl);
            if (!response.ok) {
                return res.status(response.status).json({ message: 'Error fetching media' });
            }
            
            // Get the image data
            const imageBuffer = await response.arrayBuffer();
            
            // Set appropriate headers
            res.set('Content-Type', contentType || 'application/octet-stream');
            res.set('Cache-Control', 'private, max-age=300'); // 5 minutes cache, private
            
            // Send the image data
            res.send(Buffer.from(imageBuffer));
        } catch (err) {
            console.error('Private media proxy error:', err);
            res.status(500).json({ message: 'Error serving private media' });
        }
    },
    
    /**
     * @swagger
     * /api/gallery/refresh/{id}:
     *   get:
     *     summary: Refresh media URLs for a gallery item
     *     tags: [Gallery]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: Gallery item ID
     *     responses:
     *       200:
     *         description: Refreshed gallery item URLs
     */
    refreshMediaUrls: async (req, res) => {
        try {
            const id = decryptId(req.params.id);
            
            const gallery = await knex('media_gallery')
                .where({ id })
                .whereNull('deleted_at')
                .first();
                
            if (!gallery) {
                return res.status(404).json({ message: 'Gallery item not found' });
            }
            
            // Check if this is a private item
            const isPrivate = gallery.is_private === true;
            
            // If it's private and user is not authenticated, return limited info
            if (isPrivate && !req.user) {
                return res.status(403).json({ 
                    message: 'Authentication required to refresh private media',
                    requires_authentication: true
                });
            }
            
            // Process the item to generate fresh media proxy URLs
            const result = await processGalleryItemUrls(gallery, !!req.user);
            
            res.status(200).json({ 
                message: 'Gallery item URLs refreshed successfully', 
                data: result
            });
        } catch (err) {
            console.error('Error refreshing gallery item URLs:', err);
            res.status(500).json({ message: err.message });
        }
    },

    /**
     * @swagger
     * /api/gallery/cache/stats:
     *   get:
     *     summary: Get cache statistics (admin only)
     *     tags: [Admin]
     *     security:
     *       - cookieAuth: []
     *     responses:
     *       200:
     *         description: Cache statistics
     */
    getCacheStats: async (req, res) => {
        // Ensure only admins can access
        if (!req.user || !req.user.is_admin) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        
        const stats = {
            keys: signedUrlCache.keys(),
            stats: signedUrlCache.getStats(),
            hits: signedUrlCache.getStats().hits,
            misses: signedUrlCache.getStats().misses,
            hitRate: signedUrlCache.getStats().hits / 
            (signedUrlCache.getStats().hits + signedUrlCache.getStats().misses || 1)
        };
        
        res.status(200).json(stats);
    },
    generateMediaProxyUrl
};

// Optimization for frequently accessed images - preload popular images
// async function preloadPopularMedia() {
//   try {
//     // Get top 20 most viewed media items
//     const popularItems = await knex('media_gallery')
//       .whereNull('deleted_at')
//       .orderBy('view_count', 'desc')
//       .limit(20);
    
//     for (const item of popularItems) {
//       if (item.type === 'image') {
//         if (item.image_small) {
//           const file = bucket.file(getFilenameFromUrl(item.image_small));
//           await getCachedSignedUrl(file);
//         }
//         if (item.image_medium) {
//           const file = bucket.file(getFilenameFromUrl(item.image_medium));
//           await getCachedSignedUrl(file);
//         }
//       }
//     }
//     console.log('Preloaded signed URLs for popular media');
//   } catch (err) {
//     console.error('Error preloading popular media:', err);
//   }
// }

// Call this function periodically (e.g., every 4 minutes)
// setInterval(preloadPopularMedia, 4 * 60 * 1000);

// Add memory monitoring for the cache
setInterval(() => {
  const memoryUsage = process.memoryUsage();
  const cacheStats = signedUrlCache.getStats();
  const cacheKeys = signedUrlCache.keys().length;
  
  console.log({
    memoryUsage: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
    },
    cache: {
      keys: cacheKeys,
      hits: cacheStats.hits,
      misses: cacheStats.misses,
      hitRate: `${Math.round((cacheStats.hits / (cacheStats.hits + cacheStats.misses || 1)) * 100)}%`
    }
  });
  
  // Auto-adjust cache size if memory pressure is high
  if (memoryUsage.heapUsed > 0.7 * memoryUsage.heapTotal) {
    // If heap usage is over 70%, flush half the cache
    const currentKeys = signedUrlCache.keys();
    const keysToRemove = currentKeys.slice(0, Math.floor(currentKeys.length / 2));
    keysToRemove.forEach(key => signedUrlCache.del(key));
    console.log(`Memory pressure detected: removed ${keysToRemove.length} cached URLs`);
  }
}, 60000); // Check every minute