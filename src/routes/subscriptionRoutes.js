const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { 
    createCheckoutSession,
    verifyPaymentStatus,
    cancelSubscription,
    getSubscriptionStatus
} = require('../controllers/subscriptionController');

// Crear sesión de checkout
router.post('/create-checkout-session', verifyToken, createCheckoutSession);

// Verificar estado del pago
router.get('/verify-payment', verifyToken, verifyPaymentStatus);

// Cancelar suscripción
router.post('/cancel', verifyToken, cancelSubscription);

// Obtener estado de suscripción
router.get('/status', verifyToken, getSubscriptionStatus);

module.exports = router;