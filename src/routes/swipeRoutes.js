const express = require('express');
const router = express.Router();
const {
  createSwipe,
  getDiscoverUsers,
  getUserMatches,
  getSwipeStats
} = require('../controllers/swipeController');

// Middleware de autenticación
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// POST /api/swipe - Dar like o dislike a un usuario
router.post('/', createSwipe);

// GET /api/swipe/discover - Obtener usuarios para descubrir
// Query params: profile_type_filter (team|agent|both), limit (default: 10)
router.get('/discover', getDiscoverUsers);

// GET /api/swipe/matches - Obtener todos los matches del usuario
router.get('/matches', getUserMatches);

// GET /api/swipe/stats - Obtener estadísticas de swipes del usuario
router.get('/stats', getSwipeStats);

module.exports = router;