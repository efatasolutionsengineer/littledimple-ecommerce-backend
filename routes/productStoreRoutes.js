const express = require('express');
const router = express.Router();
const productStoreController = require('../controllers/productStoreController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, productStoreController.createStore);
router.get('/', productStoreController.getAllStores);
router.get('/:id', authMiddleware, productStoreController.getStoreById);
router.put('/:id', authMiddleware, productStoreController.updateStore);
router.delete('/:id', authMiddleware, productStoreController.deleteStore);

module.exports = router;
