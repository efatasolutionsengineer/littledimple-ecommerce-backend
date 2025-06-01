const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, ordersController.createOrder);
router.get('/', authMiddleware, ordersController.getAllOrders);
router.get('/me', authMiddleware, ordersController.getUserOrders);
router.post('/payment-status', authMiddleware, ordersController.statusPayment);
router.post('/cancel-payment', authMiddleware, ordersController.cancelPayment);
router.post('/callback-payment', authMiddleware, ordersController.callbackPayment);

// In your routes file
router.get('/details/:order_id', authMiddleware, ordersController.getOrderDetails);
router.get('/admin/order-details', authMiddleware, ordersController.getAllOrderDetails);

module.exports = router;
