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
 */
function generateMediaProxyUrl(originalUrl, expiryMinutes = 30) {
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
    
    // Create proxy URL
    return `/api/media/view?path=${encodeURIComponent(mediaPath)}&expires=${expiryTimestamp}&token=${token}`;
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
 */
async function processGalleryItemUrls(item) {
  try {
    const result = { ...item };
    
    // Use media proxy URLs for all media
    if (item.type === 'image') {
      if (item.image_small) {
        result.image_small = generateMediaProxyUrl(item.image_small);
      }
      if (item.image_medium) {
        result.image_medium = generateMediaProxyUrl(item.image_medium);
      }
      if (item.image_high) {
        result.image_high = generateMediaProxyUrl(item.image_high);
      }
      if (item.image_original) {
        result.image_original = generateMediaProxyUrl(item.image_original, 5); // Shorter expiry for original
      }
    } else if (item.type === 'video') {
      if (item.video_link) {
        result.video_link = generateMediaProxyUrl(item.video_link, 60); // Longer expiry for videos
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
     *     responses:
     *       201:
     *         description: Media uploaded successfully
     */
    uploadMedia: async (req, res) => {
        try {
        const { title, tag } = req.body;
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }
        
        const results = [];
        
        for (const file of req.files) {
            let mediaData = {
            title: title || file.originalname,
            slug: generateSlug(title || file.originalname),
            tag: tag || null,
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
            
            // Process URLs and encrypt ID
            const processedGallery = await processGalleryItemUrls(gallery);
            
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
     *     summary: Get all gallery items
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
     *         description: List of gallery items
     */
    getAllMedia: async (req, res) => {
        try {
            const { type = 'all', tag } = req.query;
            
            let query = knex('media_gallery');
            
            if (type !== 'all') {
            query = query.where('type', type);
            }
            
            if (tag) {
            query = query.where('tag', tag);
            }
            
            const galleries = await query.orderBy('created_at', 'desc');
            
            // Process gallery items to add signed URLs
            const results = await Promise.all(galleries.map(async (item) => {
            const result = { ...item };
            
            // Don't generate signed URLs if we're using local storage
            if (useLocalStorage()) {
                result.id = encryptId(item.id);
                return result;
            }
            
            try {
                if (item.type === 'image') {
                // Generate signed URLs for all image sizes
                if (item.image_small) {
                    const smallFile = getFilenameFromUrl(item.image_small);
                    if (smallFile) {
                    const [smallUrl] = await bucket.file(smallFile).getSignedUrl({
                        version: 'v4',
                        action: 'read',
                        expires: Date.now() + (30 * 60 * 1000) // 30 minutes
                    });
                    result.image_small = smallUrl;
                    }
                }
                
                if (item.image_medium) {
                    const mediumFile = getFilenameFromUrl(item.image_medium);
                    if (mediumFile) {
                    const [mediumUrl] = await bucket.file(mediumFile).getSignedUrl({
                        version: 'v4',
                        action: 'read',
                        expires: Date.now() + (30 * 60 * 1000) // 30 minutes
                    });
                    result.image_medium = mediumUrl;
                    }
                }
                
                if (item.image_high) {
                    const highFile = getFilenameFromUrl(item.image_high);
                    if (highFile) {
                    const [highUrl] = await bucket.file(highFile).getSignedUrl({
                        version: 'v4',
                        action: 'read',
                        expires: Date.now() + (30 * 60 * 1000) // 30 minutes
                    });
                    result.image_high = highUrl;
                    }
                }
                
                if (item.image_original) {
                    const originalFile = getFilenameFromUrl(item.image_original);
                    if (originalFile) {
                    const [originalUrl] = await bucket.file(originalFile).getSignedUrl({
                        version: 'v4',
                        action: 'read',
                        expires: Date.now() + (15 * 60 * 1000) // 15 minutes for original (higher quality)
                    });
                    result.image_original = originalUrl;
                    }
                }
                } else if (item.type === 'video') {
                // Generate signed URL for video
                if (item.video_link) {
                    const videoFile = getFilenameFromUrl(item.video_link);
                    if (videoFile) {
                    const [videoUrl] = await bucket.file(videoFile).getSignedUrl({
                        version: 'v4',
                        action: 'read',
                        expires: Date.now() + (60 * 60 * 1000) // 60 minutes for videos
                    });
                    result.video_link = videoUrl;
                    }
                }
                }
            } catch (error) {
                console.error(`Error generating signed URLs for item ${item.id}:`, error);
                // Keep the original URLs if there's an error
            }
            
            // Always encrypt the ID
            result.id = encryptId(item.id);
            
            return result;
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
     *     summary: Get gallery item by ID
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
     */
    getMediaById: async (req, res) => {
        try {
        const id = decryptId(req.params.id);
        
        const gallery = await knex('media_gallery')
            .where({ id })
            .first();
            
        if (!gallery) {
            return res.status(404).json({ message: 'Gallery item not found' });
        }
        
        // Process the item to add media proxy URLs
        const result = await processGalleryItemUrls(gallery);
        
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
     *     summary: Get gallery item by slug
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
     *         description: Gallery item details
     */
    getMediaBySlug: async (req, res) => {
        try {
        const { slug } = req.params;
        
        const gallery = await knex('media_gallery')
            .where({ slug })
            .first();
            
        if (!gallery) {
            return res.status(404).json({ message: 'Gallery item not found' });
        }
        
        // Process the item to add media proxy URLs
        const result = await processGalleryItemUrls(gallery);
        
        res.status(200).json({ 
            message: 'Gallery item retrieved successfully', 
            data: result
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
     *     responses:
     *       200:
     *         description: Gallery item updated successfully
     */
    updateMedia: async (req, res) => {
        try {
        const id = decryptId(req.params.id);
        const { title, tag } = req.body;
        
        // Check if gallery item exists
        const gallery = await knex('media_gallery')
            .where({ id })
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
        
        // Update gallery item
        const [updatedGallery] = await knex('media_gallery')
            .where({ id })
            .update(updateData)
            .returning('*');
        
        // Process the updated item to add media proxy URLs
        const result = await processGalleryItemUrls(updatedGallery);
        
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
     *     summary: Stream video from gallery
     *     tags: [Gallery]
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
     */
    streamVideo: async (req, res) => {
        try {
        const id = decryptId(req.params.id);
        
        // Get the video from database
        const gallery = await knex('media_gallery')
            .where({ id, type: 'video' })
            .first();
            
        if (!gallery || !gallery.video_link) {
            return res.status(404).json({ message: 'Video not found' });
        }
        
        // Generate a media proxy URL with longer expiration for video streaming (60 minutes)
        const proxyUrl = generateMediaProxyUrl(gallery.video_link, 60);
        
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
     *     summary: Media proxy to serve images and videos securely
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
        const [signedUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + (5 * 60 * 1000) // 5 minutes
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
            .first();
            
        if (!gallery) {
            return res.status(404).json({ message: 'Gallery item not found' });
        }
        
        // Process the item to generate fresh media proxy URLs
        const result = await processGalleryItemUrls(gallery);
        
        res.status(200).json({ 
            message: 'Gallery item URLs refreshed successfully', 
            data: result
        });
        } catch (err) {
        console.error('Error refreshing gallery item URLs:', err);
        res.status(500).json({ message: err.message });
        }
    }
};