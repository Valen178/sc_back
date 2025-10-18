const express = require('express');
const {
  getAllSports,
  getAllLocations,
} = require('../controllers/lookupController');

const router = express.Router();

// Rutas públicas para datos de referencia
router.get('/sports', getAllSports);
router.get('/locations', getAllLocations);

module.exports = router;