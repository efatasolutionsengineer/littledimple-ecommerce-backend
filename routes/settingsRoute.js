const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/authMiddleware');
const adminCheck = require('../middleware/adminCheck');

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Pengaturan aplikasi dan konten website
 */
router.use(authMiddleware);
router.use(adminCheck);
router.get('/general', settingsController.getGeneralSettings);
router.put('/general', settingsController.updateGeneralSettings);

router.get('/carousels', settingsController.getCarousels);
router.post('/carousels', settingsController.createCarousel);
router.put('/carousels/:id', settingsController.updateCarousel);
router.delete('/carousels/:id', settingsController.deleteCarousel);

router.get('/available-payments', settingsController.getAvailablePayments);
router.post('/available-payments', settingsController.createAvailablePayment);
router.put('/available-payments/:id', settingsController.updateAvailablePayment);
router.delete('/available-payments/:id', settingsController.deleteAvailablePayment);

router.get('/our-services', settingsController.getOurServices);
router.put('/our-services/:id', settingsController.updateOurService);

router.get('/contact-us', settingsController.getContactUs);
router.put('/contact-us/:id', settingsController.updateContactUs);
router.delete('/contact-us/:id', settingsController.deleteContactUs);

module.exports = router;