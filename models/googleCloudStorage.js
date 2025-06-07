// models/googleCloudStorage.js
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const slugify = require('slugify');

// Initialize Google Cloud Storage
const storage = new Storage({
//   keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET_NAME);

// Image resize configurations
const SIZES = {
  small: { width: 320, height: 240 },
  medium: { width: 640, height: 480 },
  high: { width: 1280, height: 960 },
  original: { width: null, height: null } // Original size
};

// Function to upload file to Google Cloud Storage
const uploadToGCS = (file, folder = 'gallery') => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided'));
    }

    const filename = `${folder}/${uuidv4()}-${file.originalname.replace(/\s+/g, '_')}`;
    const fileUpload = bucket.file(filename);
    
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
};

// Function to process and upload an image in multiple sizes
const processAndUploadImage = async (file) => {
  try {
    const fileExt = path.extname(file.originalname);
    const uniquePrefix = uuidv4();
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
        originalname: `${uniquePrefix}-${size}${fileExt}`,
        buffer: resizedBuffer,
        mimetype: file.mimetype
      };

      const url = await uploadToGCS(resizedFile, 'gallery/images');
      
      // Map to your schema's column names
      switch(size) {
        case 'small': 
          results.image_small = url;
          break;
        case 'medium': 
          results.image_medium = url;
          break;
        case 'high': 
          results.image_high = url;
          break;
        case 'original': 
          results.image_original = url;
          break;
      }
    }

    return results;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
};

// Function to upload a video
const uploadVideo = async (file) => {
  try {
    const url = await uploadToGCS(file, 'gallery/videos');
    return { video_link: url };
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
};

// Function to generate a unique slug
const generateSlug = (title) => {
  const baseSlug = slugify(title, { lower: true, strict: true });
  const uniqueSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${uniqueSuffix}`;
};

module.exports = {
  uploadToGCS,
  processAndUploadImage,
  uploadVideo,
  generateSlug
};