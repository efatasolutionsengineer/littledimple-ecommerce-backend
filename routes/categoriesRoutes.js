// routes/categoriesRoutes.js
const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categoriesController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', categoriesController.getAll);
router.get('/:id', categoriesController.getById);
router.post('/', authMiddleware, categoriesController.create);
router.put('/:id', authMiddleware, categoriesController.update);
router.delete('/:id', authMiddleware, categoriesController.softDelete);

module.exports = router;
