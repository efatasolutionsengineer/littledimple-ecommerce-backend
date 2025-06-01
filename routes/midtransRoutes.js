const express = require('express');
const router = express.Router();
const midtransController = require('../controllers/midtransController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Midtrans
 *   description: Midtrans payment gateway endpoints
 */

// Public notification endpoint (no auth required)
router.post('/notification', midtransController.handleNotification);

// Protected routes (require authentication)
router.use(authMiddleware);

router.post('/create-transaction', midtransController.createTransaction);
router.get('/status/:transaction_id', midtransController.checkStatus);
router.post('/cancel/:transaction_id', midtransController.cancelTransaction);

module.exports = router;