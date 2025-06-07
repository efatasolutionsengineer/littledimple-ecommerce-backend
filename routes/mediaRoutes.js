// routes/mediaRoutes.js
const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');

/**
 * @swagger
 * tags:
 *   name: Media
 *   description: Media proxy API for serving secure images and videos
 */

/**
 * Media proxy endpoint that handles secure media serving
 * This endpoint requires:
 * - path: The GCS path to the media
 * - expires: Timestamp when the URL expires
 * - token: Security token for verification
 */
router.get('/view', galleryController.mediaProxy);

module.exports = router;