const express = require('express');
const router = express.Router();
const productsController = require('../controllers/productsController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', productsController.getAll);
router.get('/id/:id', productsController.getById);
router.get('/hot', productsController.getAllHot);
router.get('/new', productsController.getAllNew);
router.get('/slug/:slug', productsController.getBySlug);
router.post('/', authMiddleware, productsController.create);
router.put('/:slug', authMiddleware, productsController.update);
router.delete('/:slug', authMiddleware, productsController.remove);

module.exports = router;