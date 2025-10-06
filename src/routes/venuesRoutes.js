const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getNearbyVenues, getVenueDetails } = require('../controllers/venuesController');

// Obtener venues cercanos
router.get('/', verifyToken, getNearbyVenues);

// Obtener detalles de un venue específico
router.get('/:placeId', verifyToken, getVenueDetails);

module.exports = router;