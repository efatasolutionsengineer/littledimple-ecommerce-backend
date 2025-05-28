const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const voucherController = require('../controllers/voucherController');

// Apply authMiddleware to all voucher routes
router.use(authMiddleware);

// Create voucher
router.post('/', voucherController.createVoucher);

// Get all vouchers by member
router.get('/me', voucherController.getVouchers);

// Get all vouchers
router.get('/', voucherController.getAllVouchers);

// Get voucher by code
router.get('/code/:code', voucherController.getVoucherByCode);

// Validate voucher (check if it's usable)
router.get('/validate/:code', voucherController.validateVoucher);

// Update voucher
router.put('/:id', voucherController.updateVoucher);

// Soft delete voucher
router.delete('/:id', voucherController.deleteVoucher);

module.exports = router;
