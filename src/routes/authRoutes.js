const express = require('express');
const { signup, login, googleLogin, completeProfile } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Rutas públicas
router.post('/signup', signup);
router.post('/login', login);
router.post('/google', googleLogin);

// Rutas protegidas
router.post('/complete-profile', verifyToken, completeProfile);

module.exports = router;
