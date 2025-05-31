const express = require('express');
const router = express.Router();
const littleDimpleController = require('../controllers/littleDimpleController');
const upload = require('../middleware/multer');

router.get('/home', littleDimpleController.getHome);
router.post('/contact_us', littleDimpleController.postContactUs);
router.post('/warranty', littleDimpleController.checkWarranty);
router.post(
  '/manual-warranty',
  upload.fields([
    { name: 'attachment_receipt', maxCount: 1 },
    { name: 'attachment_barcode', maxCount: 1 },
    { name: 'attachment_product', maxCount: 1 }
  ]),
  littleDimpleController.insertManualWarranty
);
router.post('/sessions', littleDimpleController.createSession);


module.exports = router;