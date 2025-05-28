const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, ordersController.createOrder);
router.get('/', authMiddleware, ordersController.getUserOrders);
router.post('/payment-status', authMiddleware, ordersController.statusPayment);
router.post('/cancel-payment', authMiddleware, ordersController.cancelPayment);
router.post('/callback-payment', authMiddleware, ordersController.callbackPayment);


module.exports = router;
