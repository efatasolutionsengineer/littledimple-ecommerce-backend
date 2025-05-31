const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', usersController.register);
router.post('/login', usersController.login);
router.post('/logout', authMiddleware, usersController.logout);
router.get('/me', authMiddleware, usersController.getProfile);
router.get('/', authMiddleware, usersController.getAllUsers);
router.delete('/:id', authMiddleware, usersController.softDeleteUser);
router.post('/send-verification', usersController.sendVerification);
router.get('/verify-email/:token', usersController.verifyEmail);
router.post('/forgot-password', usersController.forgotPassword);
router.post('/reset-password/:token', usersController.resetPassword);

// router.post('/grabdata_kecamatan', usersController.grabDataKecamatan);
// router.post('/grabdata_kelurahan', usersController.grabDataKelurahan);


module.exports = router;