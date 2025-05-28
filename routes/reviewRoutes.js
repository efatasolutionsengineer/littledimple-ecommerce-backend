const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Reviews
 *   description: Product reviews from users
 */

// router.use(authMiddleware);

router.post('/', authMiddleware, reviewController.createReview);
router.get('/', reviewController.getAllReviews);
router.get('/slug/:slug', reviewController.getAllReviewsBySlug);
router.delete('/:id', authMiddleware, reviewController.deleteReview);

module.exports = router;
