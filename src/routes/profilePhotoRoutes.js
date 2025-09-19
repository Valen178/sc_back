const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifyToken } = require('../middleware/auth');
const { uploadProfilePhoto, deleteProfilePhoto } = require('../controllers/profilePhotoController');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

router.post('/upload', verifyToken, upload.single('photo'), uploadProfilePhoto);
router.delete('/delete', verifyToken, deleteProfilePhoto);

module.exports = router;