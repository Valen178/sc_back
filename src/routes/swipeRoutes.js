const express = require('express');
const router = express.Router();
const {
  createSwipe,
  getDiscoverUsers,
  getUserMatches,
  getSwipeStats,
  getDirectContact
} = require('../controllers/swipeController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// POST /api/swipe - Dar like o dislike a un usuario
router.post('/', createSwipe);

// GET /api/swipe/discover - Obtener usuarios para descubrir
// Query params: profile_type_filter (team|agent|both), limit (default: 10)
router.get('/discover', getDiscoverUsers);

// GET /api/swipe/matches - Obtener todos los matches del usuario
router.get('/matches', getUserMatches);

// GET /api/swipe/stats - Obtener estadísticas de swipes (límites y premium)
router.get('/stats', getSwipeStats);

// GET /api/swipe/contact/:target_user_id - Obtener contacto directo (solo premium)
router.get('/contact/:target_user_id', getDirectContact);

module.exports = router;