const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/me', cartController.getCart);
router.get('/', cartController.getAllCarts);
router.post('/', cartController.addToCart);
router.delete('/:id', cartController.deleteCartItem);

module.exports = router;
