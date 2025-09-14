const express = require('express');
const {
  getAllSports,
  getAllLocations,
  getLocationsByCountry,
} = require('../controllers/lookupController');

const router = express.Router();

// Rutas públicas para datos de referencia
router.get('/sports', getAllSports);
router.get('/locations', getAllLocations);
router.get('/locations/country/:country', getLocationsByCountry);

module.exports = router;
