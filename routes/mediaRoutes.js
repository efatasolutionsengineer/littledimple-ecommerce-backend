// routes/mediaRoutes.js
const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');

// Catch-all route to handle any media path
router.get('/*', mediaController.serveMedia);

module.exports = router;