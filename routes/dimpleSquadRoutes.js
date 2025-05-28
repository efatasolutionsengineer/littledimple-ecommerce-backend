const express = require('express');
const router = express.Router();
const controller = require('../controllers/dimpleSquadController');

/**
 * @swagger
 * tags:
 *   name: Dimple Squad
 *   description: Section for managing Dimple Squad content
 */

router.post('/', controller.create);
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);

module.exports = router;
