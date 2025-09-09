const express = require('express');
const { verifyToken } = require('../middleware/auth');
const { updateProfile, getMyProfile, deleteMyProfile } = require('../controllers/profileController');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Obtener mi perfil
router.get('/me', getMyProfile);

// Actualizar mi perfil
router.put('/me', updateProfile);

// Eliminar mi perfil y usuario
router.delete('/me', deleteMyProfile);

module.exports = router;
