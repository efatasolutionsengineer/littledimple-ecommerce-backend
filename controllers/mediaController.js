// controllers/mediaController.js
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs').promises;
const { Readable } = require('stream');

// Initialize storage with Application Default Credentials
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'ecommerce-media-uploads';
const bucket = storage.bucket(bucketName);

// Track which files exist locally to avoid unnecessary file checks
const localFileCache = new Map();

module.exports = {
  /**
   * Media proxy handler
   */
  serveMedia: async (req, res) => {
    const mediaPath = req.params[0]; // Get the full path from wildcard route
    
    try {
      // First, check for local file
      if (mediaPath.startsWith('uploads/')) {
        const localPath = path.join(__dirname, '../public', mediaPath);
        
        // Use cache to avoid checking file system repeatedly
        const cacheKey = `local:${localPath}`;
        let exists = localFileCache.get(cacheKey);
        
        if (exists === undefined) {
          try {
            await fs.access(localPath);
            exists = true;
            localFileCache.set(cacheKey, true);
          } catch {
            exists = false;
            localFileCache.set(cacheKey, false);
          }
        }
        
        if (exists) {
          // Set content type
          const ext = path.extname(localPath).toLowerCase();
          const contentType = getContentType(ext);
          res.setHeader('Content-Type', contentType);
          
          // Add caching headers
          res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
          
          // Stream the file
          const fileStream = fs.createReadStream(localPath);
          fileStream.on('error', (err) => {
            console.error(`Error streaming local file: ${localPath}`, err);
            if (!res.headersSent) {
              res.status(500).send('Error streaming file');
            }
          });
          
          fileStream.pipe(res);
          return;
        }
      }
      
      // If not found locally, try to serve from GCS
      // Remove leading slash if present
      const gcsPath = mediaPath.startsWith('/') ? mediaPath.substring(1) : mediaPath;
      
      console.log(`Fetching from GCS: ${gcsPath}`);
      
      // Get file reference
      const file = bucket.file(gcsPath);
      
      // Check if file exists in GCS
      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).send('File not found');
      }
      
      // Get metadata
      const [metadata] = await file.getMetadata();
      
      // Set appropriate headers
      res.setHeader('Content-Type', metadata.contentType || getContentType(path.extname(gcsPath)));
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      
      // Download and stream to response
      file.createReadStream()
        .on('error', (err) => {
          console.error(`Error streaming from GCS: ${gcsPath}`, err);
          if (!res.headersSent) {
            res.status(500).send('Error streaming file');
          }
        })
        .pipe(res);
        
    } catch (err) {
      console.error(`Error serving media ${mediaPath}:`, err);
      if (!res.headersSent) {
        res.status(500).send('Error serving media');
      }
    }
  },
  
  /**
   * Update gallery item URLs to use the proxy
   */
  processGalleryUrls: (item) => {
    if (!item) return item;
    
    const result = { ...item };
    
    // Process image URLs
    if (item.type === 'image') {
      ['small', 'medium', 'high', 'original'].forEach(size => {
        const key = `image_${size}`;
        if (result[key]) {
          // Convert GCS URLs to proxy URLs
          if (result[key].includes('storage.googleapis.com')) {
            result[key] = convertGcsUrlToProxyUrl(result[key]);
          }
          // Make sure local URLs go through the proxy too
          else if (result[key].startsWith('/uploads/')) {
            result[key] = `/media${result[key]}`;
          }
        }
      });
    }
    
    // Process video URL
    if (item.type === 'video' && result.video_link) {
      if (result.video_link.includes('storage.googleapis.com')) {
        result.video_link = convertGcsUrlToProxyUrl(result.video_link);
      } else if (result.video_link.startsWith('/uploads/')) {
        result.video_link = `/media${result.video_link}`;
      }
    }
    
    return result;
  }
};

/**
 * Helper function to determine content type
 */
function getContentType(extension) {
  const types = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.wmv': 'video/x-ms-wmv'
  };
  
  return types[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Convert a GCS URL to a proxy URL
 */
function convertGcsUrlToProxyUrl(gcsUrl) {
  try {
    if (!gcsUrl || !gcsUrl.includes('storage.googleapis.com')) {
      return gcsUrl;
    }
    
    // Parse the URL
    const url = new URL(gcsUrl);
    
    // Extract path components
    const pathParts = url.pathname.split('/');
    
    // Remove empty first element and bucket name
    const objectPath = pathParts.slice(2).join('/');
    
    // Return the proxy URL
    return `/media/${objectPath}`;
  } catch (err) {
    console.error('Error converting GCS URL:', err);
    return gcsUrl;
  }
}