const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');
const authMiddleware = require('../middleware/authMiddleware');
const adminCheck = require('../middleware/adminCheck');

router.post('/', authMiddleware, ordersController.createOrder);
router.get('/me', authMiddleware, ordersController.getUserOrders);
router.get('/details/:order_id', authMiddleware, ordersController.getOrderDetails);

router.post('/payment-status', authMiddleware, ordersController.statusPayment);
router.post('/cancel-payment', authMiddleware, ordersController.cancelPayment);
router.post('/callback-payment', authMiddleware, ordersController.callbackPayment);


router.use(adminCheck);
router.get('/', authMiddleware, ordersController.getAllOrders);
router.get('/admin/order-details', authMiddleware, ordersController.getAllOrderDetails);
router.put('/status/:order_id', authMiddleware, ordersController.updateOrderStatus);

module.exports = router;