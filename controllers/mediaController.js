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
    try {
      // If using specific routes
      if (req.params.year && req.params.month) {
        const { type, year, month, size, filename } = req.params;
        
        // Construct the path based on parameters
        let mediaPath;
        if (size) {
          // For images with size
          mediaPath = `${type}/${year}/${month}/${size}/${filename}`;
        } else {
          // For videos
          mediaPath = `${type}/${year}/${month}/${filename}`;
        }
        
        return serveMediaFile(mediaPath, req, res);
      }
      
      // For wildcard route
      const mediaPath = req.params.path;
      return serveMediaFile(mediaPath, req, res);
    } catch (err) {
      console.error('Error in serveMedia:', err);
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

async function serveMediaFile(mediaPath, req, res) {
  try {
    // First, check for local file
    if (mediaPath.startsWith('uploads/')) {
      const localPath = path.join(__dirname, '../public', mediaPath);
      
      try {
        await fs.access(localPath);
        
        // Set content type
        const ext = path.extname(localPath).toLowerCase();
        const contentType = getContentType(ext);
        res.setHeader('Content-Type', contentType);
        
        // Stream the file
        const fileStream = fs.createReadStream(localPath);
        fileStream.pipe(res);
        return;
      } catch (err) {
        // File not found locally, try GCS
        console.log('File not found locally, trying GCS...');
      }
    }
    
    // Try to serve from GCS
    console.log(`Fetching from GCS: ${mediaPath}`);
    
    // Get file reference
    const file = bucket.file(mediaPath);
    
    // Check if file exists in GCS
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).send('File not found');
    }
    
    // Get metadata
    const [metadata] = await file.getMetadata();
    
    // Set headers
    res.setHeader('Content-Type', metadata.contentType || getContentType(path.extname(mediaPath)));
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    // Stream the file
    file.createReadStream().pipe(res);
  } catch (err) {
    console.error(`Error serving media file ${mediaPath}:`, err);
    if (!res.headersSent) {
      res.status(500).send('Error serving media file');
    }
  }
}