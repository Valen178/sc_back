const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  createPost,
  getAllPosts,
  getPost,
  deletePost,
  getUserPosts
} = require('../controllers/postController');

// Rutas públicas (sin autenticación)
router.get('/', getAllPosts);

// Rutas protegidas (requieren autenticación)
router.post('/', verifyToken, createPost);
router.get('/my-posts', verifyToken, getUserPosts);

// Rutas públicas
router.get('/:id', getPost);

// Rutas protegidas
router.delete('/:id', verifyToken, deletePost);

module.exports = router;
