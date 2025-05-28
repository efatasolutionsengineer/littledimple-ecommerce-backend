const express = require('express');
const router = express.Router();
const multer = require('multer');
const productImageController = require('../controllers/productImageController');
const authMiddleware = require('../middleware/authMiddleware');

// Setting multer storage and limits
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Allow only image file types
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
}).array('images', 10); // Handle up to 10 images

router.post(
  '/product-images',
  authMiddleware,
  upload,
  productImageController.uploadImages
);

router.get('/product-images/:productId', productImageController.getImagesByProductId);

router.delete(
  '/product-images/:id',
  authMiddleware,
  productImageController.softDeleteImage
);

router.put(
  '/product-images/:id',
  authMiddleware,
  upload,
  productImageController.updateImage
);

// Untuk unggahan gambar blog (contohnya untuk postingan blog)
router.post(
  '/blog-images/:postId', 
  authMiddleware,
  upload, 
  productImageController.uploadImagesBlog);

module.exports = router;
