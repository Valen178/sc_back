const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { 
    getPublicPlans,
    createCheckoutSession,
    verifyPaymentStatus,
    cancelSubscription,
    getSubscriptionStatus,
    handleStripeWebhook,
    markExpiredSubscriptions
} = require('../controllers/subscriptionController');

// Rutas públicas (sin autenticación)
router.get('/plans', getPublicPlans);

// Webhook de Stripe - DEBE procesar raw body antes que express.json()
// Se aplica solo a esta ruta específica
router.post('/webhook', 
  express.raw({ type: 'application/json' }), 
  handleStripeWebhook
);

// Rutas protegidas (requieren autenticación)
// Crear sesión de checkout
router.post('/create-checkout-session', verifyToken, createCheckoutSession);

// Verificar estado del pago
router.get('/verify-payment', verifyToken, verifyPaymentStatus);

// Cancelar suscripción
router.post('/cancel', verifyToken, cancelSubscription);

// Obtener estado de suscripción
router.get('/status', verifyToken, getSubscriptionStatus);

// Marcar suscripciones expiradas (puede ejecutarse manualmente o con cron)
router.post('/mark-expired', markExpiredSubscriptions);

module.exports = router;