const express = require('express');
const { verifyToken, isAdmin } = require('../middleware/auth');
const {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  changeUserRole
} = require('../controllers/adminController');

const router = express.Router();

const {
  getAllSubscriptions,
  getSubscription,
  updateSubscription,
  deleteSubscription,
  getAllPlans,
  createPlan,
  deletePlan
} = require('../controllers/subscriptionController');

const {
  getAllPosts,
  getPost,
  deletePost
} = require('../controllers/postController');

const {
  // Deportes
  getAllSports,
  getSport,
  createSport,
  updateSport,
  deleteSport,
  
  // Ubicaciones
  getAllLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation
} = require('../controllers/masterDataController');

// Todas las rutas requieren autenticación y rol de admin
router.use(verifyToken, isAdmin);

// === USUARIOS ===
router.get('/users', getAllUsers);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/role', changeUserRole);

// === PLANES Y SUSCRIPCIONES ===
router.get('/plans', getAllPlans);
router.post('/plans', createPlan);
router.delete('/plans/:id', deletePlan);

router.get('/subscriptions', getAllSubscriptions);
router.get('/subscriptions/:id', getSubscription);
router.put('/subscriptions/:id', updateSubscription);
router.delete('/subscriptions/:id', deleteSubscription);

// === PUBLICACIONES ===
router.get('/posts', getAllPosts);
router.get('/posts/:id', getPost);
router.delete('/posts/:id', deletePost);

// === DEPORTES ===
router.get('/sports', getAllSports);
router.get('/sports/:id', getSport);
router.post('/sports', createSport);
router.put('/sports/:id', updateSport);
router.delete('/sports/:id', deleteSport);

// === UBICACIONES ===
router.get('/locations', getAllLocations);
router.get('/locations/:id', getLocation);
router.post('/locations', createLocation);
router.put('/locations/:id', updateLocation);
router.delete('/locations/:id', deleteLocation);
router.use(verifyToken, isAdmin);

// Rutas de administración de usuarios
router.get('/users', getAllUsers);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/role', changeUserRole);

module.exports = router;
