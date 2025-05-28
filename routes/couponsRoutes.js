const express = require('express');
const router = express.Router();
const couponsController = require('../controllers/couponsController');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Coupons
 *   description: Manajemen kupon diskon
 */

router.use(authMiddleware);

router.post('/', couponsController.createCoupon);
router.get('/', couponsController.getAllCoupons);
router.get('/:code', couponsController.getCouponByCode);
router.get('/publish', couponsController.getAllCouponsPublish);
router.put('/:id', couponsController.updateCoupon);
router.delete('/:id', couponsController.deleteCoupon);

module.exports = router;
