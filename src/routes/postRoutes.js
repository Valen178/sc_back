const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const postController = require('../controllers/postController');

router.use(verifyToken);

// Create a new post (requires authentication)
router.post('/', postController.createPost);

// Get all posts (public)
router.get('/', postController.getAllPosts);

// Get posts by specific user (public)
router.get('/user/:userId', postController.getUserPosts);

// Delete a post (requires authentication and ownership)
router.delete('/:postId', verifyToken, postController.deletePost);

module.exports = router;