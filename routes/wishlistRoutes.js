const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Wishlist
 *   description: Wishlist (daftar keinginan produk) pengguna
 */

router.use(authMiddleware);

router.post('/', wishlistController.addToWishlist);
router.get('/', authMiddleware ,wishlistController.getAllWishlist);
router.get('/me', authMiddleware, wishlistController.getWishlist);
router.delete('/:id', wishlistController.deleteWishlist);

module.exports = router;
