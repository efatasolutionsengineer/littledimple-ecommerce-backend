const express = require('express');
const router = express.Router();
const generalSettingsController = require('../controllers/generalSettingsController');
const authMiddleware = require('../middleware/authMiddleware');

// router.use(authMiddleware);

router.get('/', generalSettingsController.getSettings);
router.get('/home', generalSettingsController.getSettings);
router.put('/', authMiddleware, generalSettingsController.updateSettings);

module.exports = router;
