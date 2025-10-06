const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const lookupRoutes = require('./src/routes/lookupRoutes');
const profileRoutes = require('./src/routes/profileRoutes');
const postRoutes = require('./src/routes/postRoutes');
const swipeRoutes = require('./src/routes/swipeRoutes');
const profilePhotoRoutes = require('./src/routes/profilePhotoRoutes');

const app = express();

// Configuración de CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? 'https://tu-frontend-url.com' // Cambia esto por tu URL de producción
    : ['http://localhost:5173', 'http://localhost:3000'], // Puertos comunes para desarrollo
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Middleware de seguridad básica
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/lookup', lookupRoutes);
app.use('/profile', profileRoutes);
app.use('/posts', postRoutes);
app.use('/venues', venuesRoutes);
app.use('/swipe', swipeRoutes);
app.use('/profile-photo', profilePhotoRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
