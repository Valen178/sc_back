const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getAllVenues, getVenueById } = require('../controllers/venuesController');

// Obtener todos los venues
router.get('/', verifyToken, getAllVenues);

// Obtener detalles de un venue específico por ID
router.get('/:id', verifyToken, getVenueById);

module.exports = router;