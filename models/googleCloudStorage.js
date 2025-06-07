// utils/googleCloudStorage.js
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');
const fs = require('fs').promises;

// Local storage directory for fallback
const UPLOAD_DIR = path.join(__dirname, '../public/uploads');

// Initialize Google Cloud Storage with error handling
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'ecommerce-media-uploads';
let bucket;
let useLocalStorage = false;

// Image resize configurations
const SIZES = {
  small: { width: 320, height: 240 },
  medium: { width: 640, height: 480 },
  high: { width: 1280, height: 960 },
  original: { width: null, height: null } // Original size
};

/**
 * Creates date-based folder path in format /yyyy/yymm/
 */
function getDateBasedPath() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yearShort = year.toString().substr(2, 2);
  
  return `${year}/${yearShort}${month}/`;
}

/**
 * Initialize storage - create bucket if it doesn't exist
 */
async function initializeStorage() {
  try {
    // Check if bucket exists
    const [buckets] = await storage.getBuckets();
    const bucketExists = buckets.some(b => b.name === bucketName);
    
    if (!bucketExists) {
      console.log(`Bucket ${bucketName} doesn't exist, creating it...`);
      try {
        await storage.createBucket(bucketName, {
          location: process.env.GOOGLE_CLOUD_BUCKET_LOCATION || 'us-central1',
          storageClass: 'STANDARD',
          uniformBucketLevelAccess: true
        });
        console.log(`Bucket ${bucketName} created successfully.`);
      } catch (err) {
        console.error(`Failed to create bucket ${bucketName}:`, err);
        useLocalStorage = true;
        return;
      }
    }
    
    bucket = storage.bucket(bucketName);
    
    // Test access to the bucket
    await bucket.exists();
    console.log(`Successfully connected to bucket: ${bucketName}`);
    useLocalStorage = false;
  } catch (err) {
    console.error('Error initializing Google Cloud Storage:', err);
    console.warn('Falling back to local storage');
    useLocalStorage = true;
    
    // Ensure local directories exist
    await ensureLocalDirectories();
  }
}

/**
 * Create local directories for fallback storage
 */
async function ensureLocalDirectories() {
  const datePath = getDateBasedPath();
  const dirs = [
    `${UPLOAD_DIR}/images/${datePath}small`,
    `${UPLOAD_DIR}/images/${datePath}medium`,
    `${UPLOAD_DIR}/images/${datePath}high`,
    `${UPLOAD_DIR}/images/${datePath}original`,
    `${UPLOAD_DIR}/videos/${datePath}`
  ];
  
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (err) {
      console.error(`Error creating directory ${dir}:`, err);
    }
  }
}

/**
 * Upload a file to Google Cloud Storage
 */
async function uploadToGCS(file, folder = 'images', size = '') {
  try {
    if (!file) {
      throw new Error('No file provided');
    }
    
    const datePath = getDateBasedPath();
    const uniqueId = uuidv4();
    const safeFilename = path.basename(file.originalname).replace(/\s+/g, '-');
    const filename = `${folder}/${datePath}${uniqueId}-${safeFilename}${size ? `-${size}` : ''}`;
    
    const fileUpload = bucket.file(filename);
    
    return new Promise((resolve, reject) => {
      const blobStream = fileUpload.createWriteStream({
        resumable: false,
        metadata: {
          contentType: file.mimetype
        }
      });
      
      blobStream.on('error', (error) => {
        reject(error);
      });
      
      blobStream.on('finish', () => {
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;
        resolve(publicUrl);
      });
      
      blobStream.end(file.buffer);
    });
  } catch (err) {
    console.error('Error uploading to GCS:', err);
    throw err;
  }
}

/**
 * Save a file locally (fallback when GCS is unavailable)
 */
async function saveLocally(file, folder = 'images', size = '') {
  try {
    if (!file) {
      throw new Error('No file provided');
    }
    
    const datePath = getDateBasedPath();
    const uniqueId = uuidv4();
    const safeFilename = path.basename(file.originalname).replace(/\s+/g, '-');
    const filename = `${uniqueId}-${safeFilename}${size ? `-${size}` : ''}`;
    
    const filepath = path.join(UPLOAD_DIR, folder, datePath, size, filename);
    const dir = path.dirname(filepath);
    
    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });
    
    // Write the file
    await fs.writeFile(filepath, file.buffer);
    
    // Return a URL that can be accessed via your Express static files
    return `/uploads/${folder}/${datePath}${size ? `${size}/` : ''}${filename}`;
  } catch (err) {
    console.error('Error saving locally:', err);
    throw err;
  }
}

/**
 * Process and upload an image to GCS with multiple sizes
 */
async function processAndUploadImageToGCS(file) {
  try {
    const results = {};
    
    // Process each size
    for (const [size, dimensions] of Object.entries(SIZES)) {
      let resizedBuffer;
      
      if (size === 'original') {
        // Don't resize for original
        resizedBuffer = file.buffer;
      } else {
        // Resize for other versions
        resizedBuffer = await sharp(file.buffer)
          .resize(dimensions.width, dimensions.height, { fit: 'inside' })
          .toBuffer();
      }
      
      const resizedFile = {
        originalname: file.originalname,
        buffer: resizedBuffer,
        mimetype: file.mimetype
      };
      
      const url = await uploadToGCS(resizedFile, 'images', size);
      
      // Map to your schema's column names
      results[`image_${size}`] = url;
    }
    
    return results;
  } catch (err) {
    console.error('Error processing and uploading image to GCS:', err);
    throw err;
  }
}

/**
 * Process and save an image locally (fallback)
 */
async function processAndSaveImageLocally(file) {
  try {
    const results = {};
    
    // Process each size
    for (const [size, dimensions] of Object.entries(SIZES)) {
      let resizedBuffer;
      
      if (size === 'original') {
        // Don't resize for original
        resizedBuffer = file.buffer;
      } else {
        // Resize for other versions
        resizedBuffer = await sharp(file.buffer)
          .resize(dimensions.width, dimensions.height, { fit: 'inside' })
          .toBuffer();
      }
      
      const resizedFile = {
        originalname: file.originalname,
        buffer: resizedBuffer,
        mimetype: file.mimetype
      };
      
      const url = await saveLocally(resizedFile, 'images', size);
      
      // Map to your schema's column names
      results[`image_${size}`] = url;
    }
    
    return results;
  } catch (err) {
    console.error('Error processing and saving image locally:', err);
    throw err;
  }
}

/**
 * Upload a video to GCS
 */
async function uploadVideoToGCS(file) {
  try {
    const url = await uploadToGCS(file, 'videos');
    return { video_link: url };
  } catch (err) {
    console.error('Error uploading video to GCS:', err);
    throw err;
  }
}

/**
 * Save a video locally (fallback)
 */
async function saveVideoLocally(file) {
  try {
    const url = await saveLocally(file, 'videos');
    return { video_link: url };
  } catch (err) {
    console.error('Error saving video locally:', err);
    throw err;
  }
}

/**
 * Main function to process and upload/save image with fallback
 */
async function processAndUploadImage(file) {
  try {
    if (useLocalStorage) {
      return await processAndSaveImageLocally(file);
    } else {
      try {
        return await processAndUploadImageToGCS(file);
      } catch (err) {
        console.warn('GCS upload failed, falling back to local storage:', err.message);
        useLocalStorage = true;
        return await processAndSaveImageLocally(file);
      }
    }
  } catch (err) {
    console.error('Error in processAndUploadImage:', err);
    throw err;
  }
}

/**
 * Main function to upload/save video with fallback
 */
async function uploadVideo(file) {
  try {
    if (useLocalStorage) {
      return await saveVideoLocally(file);
    } else {
      try {
        return await uploadVideoToGCS(file);
      } catch (err) {
        console.warn('GCS upload failed, falling back to local storage:', err.message);
        useLocalStorage = true;
        return await saveVideoLocally(file);
      }
    }
  } catch (err) {
    console.error('Error in uploadVideo:', err);
    throw err;
  }
}

/**
 * Generate a unique slug
 */
function generateSlug(title) {
  const baseSlug = slugify(title, { lower: true, strict: true });
  const uniqueSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${uniqueSuffix}`;
}

/**
 * Generate a signed URL for a file
 */
async function getSignedUrl(url, expiryMinutes = 15) {
  try {
    if (useLocalStorage || !url || !url.includes('storage.googleapis.com')) {
      return url; // Return as is if local or not a GCS URL
    }
    
    // Extract filename from URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const filename = pathParts.slice(2).join('/');
    
    if (!filename) return url;
    
    const file = bucket.file(filename);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      console.warn(`File not found in bucket: ${filename}`);
      return url;
    }
    
    // Generate signed URL
    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + (expiryMinutes * 60 * 1000)
    });
    
    return signedUrl;
  } catch (err) {
    console.error('Error generating signed URL:', err);
    return url; // Return original URL on error
  }
}

// Initialize storage when module is loaded
initializeStorage().catch(err => {
  console.error('Failed to initialize storage:', err);
  useLocalStorage = true;
});

module.exports = {
  uploadToGCS,
  processAndUploadImage,
  uploadVideo,
  generateSlug,
  getSignedUrl,
  getDateBasedPath,
  useLocalStorage: () => useLocalStorage
};