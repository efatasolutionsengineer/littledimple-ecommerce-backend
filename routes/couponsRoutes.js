const express = require('express');
const router = express.Router();
const couponsController = require('../controllers/couponsController');
const authMiddleware = require('../middleware/authMiddleware');
const adminCheck = require('../middleware/adminCheck');

/**
 * @swagger
 * tags:
 *   name: Coupons
 *   description: Coupon management endpoints (Admin only)
 */

// Public routes (no authentication required)
router.get('/publish', couponsController.getAllCouponsPublish);
router.get('/code/:code', couponsController.getCouponByCode);

// User authenticated routes (authentication required)
router.get('/me', authMiddleware, couponsController.getCouponMe);
router.post('/apply', couponsController.applyCoupon);

// Apply authentication and admin check middleware to all routes
router.use(authMiddleware);
router.use(adminCheck);

// CRUD routes
router.post('/', couponsController.createCoupon);
router.get('/', couponsController.getAllCoupons);
router.get('/:id', couponsController.getCouponById);
router.put('/:id', couponsController.updateCoupon);
router.delete('/:id', couponsController.deleteCoupon);

module.exports = router;