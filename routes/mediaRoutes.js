// routes/mediaRoutes.js
const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');

// Define specific routes first (more specific to less specific)
router.get('/images/:year/:month/:size/:filename', mediaController.serveMedia);
router.get('/videos/:year/:month/:filename', mediaController.serveMedia);

// For wildcard matching, use a named parameter with wildcard
router.get('/:path(*)', mediaController.serveMedia);  // This is the correct syntax

module.exports = router;