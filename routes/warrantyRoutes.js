const express = require('express');
const router = express.Router();
const warrantyController = require('../controllers/warrantyController');
const authMiddleware = require('../middleware/authMiddleware');
const adminCheck = require('../middleware/adminCheck');

/**
 * @swagger
 * tags:
 *   name: Warranty
 *   description: Warranty management endpoints
 */

router.use(authMiddleware);

// Admin only routes
router.get('/', adminCheck, warrantyController.getAllWarranties);
router.get('/:id', adminCheck, warrantyController.getWarrantyById);

// Regular routes
router.delete('/:id', warrantyController.deleteWarranty);
router.put('/:id/status', warrantyController.updateWarrantyStatus);

module.exports = router;