// routes/galleryRoutes.js
const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');
const authMiddleware = require('../middleware/authMiddleware');
const multer = require('multer');
const adminCheck = require('../middleware/adminCheck');
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

// Public routes (no authentication required)
router.get('/', galleryController.getAllPublicMedia);
router.get('/:id', galleryController.getPublicMediaById);
router.get('/slug/:slug', galleryController.getPublicMediaBySlug);
router.get('/refresh/:id', galleryController.refreshMediaUrls);

// Media proxy endpoint for public content
router.get('/media/view', galleryController.mediaProxy);

// Protected routes (require authentication)
router.use('/private', authMiddleware);
router.get('/private', galleryController.getAllMedia);
router.get('/private/:id', galleryController.getMediaById);
router.get('/private/slug/:slug', galleryController.getMediaBySlug);
router.get('/private/stream/:id', galleryController.streamVideo);
router.get('/media/private/view', authMiddleware, galleryController.privateMediaProxy);

// Admin routes
router.use(adminCheck);
router.post('/upload', upload.array('files', 10), galleryController.uploadMedia);
router.put('/:id', galleryController.updateMedia);
router.delete('/:id', galleryController.deleteMedia);

module.exports = router;