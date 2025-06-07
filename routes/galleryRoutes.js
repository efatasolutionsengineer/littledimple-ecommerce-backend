// routes/galleryRoutes.js
const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

/**
 * @swagger
 * tags:
 *   name: Gallery
 *   description: Media gallery API for images and videos
 */

// Public routes
router.get('/', galleryController.getAllMedia);
router.get('/:id', galleryController.getMediaById);
router.get('/slug/:slug', galleryController.getMediaBySlug);
router.get('/stream/:id', galleryController.streamVideo);

// Protected routes (require authentication)
router.use(authMiddleware);
router.post('/upload', upload.array('files', 10), galleryController.uploadMedia);
router.put('/:id', galleryController.updateMedia);
router.delete('/:id', galleryController.deleteMedia);

module.exports = router;