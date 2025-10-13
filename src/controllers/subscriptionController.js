const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const getAllPlans = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('plan')
      .select(`*`);

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createPlan = async (req, res) => {
  try {
    const { name, price } = req.body;

    // Validar campos requeridos
    if (!name || !price) {
      return res.status(400).json({ 
        message: 'Name and price are required',
        missingFields: [
          !name && 'name',
          !price && 'price'
        ].filter(Boolean)
      });
    }

    const { data, error } = await supabase
      .from('plan')
      .insert([{
        name,
        price
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ message: 'Plan with this name already exists' });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('plan')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener todas las suscripciones
const getAllSubscriptions = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subscription')
      .select(`
        *,
        user:user_id (
          id,
          email,
          role
        )
      `);

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener una suscripción específica
const getSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('subscription')
      .select(`
        *,
        user:user_id (
          id,
          email,
          role
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Actualizar una suscripción
const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { end_date } = req.body;

    // Validar end_date
    if (end_date) {
      const endDate = new Date(end_date);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({ message: 'Invalid end_date format' });
      }
    }

    const { data, error } = await supabase
      .from('subscription')
      .update({ end_date })
      .eq('id', id)
      .select(`
        *,
        user:user_id (
          id,
          email,
          role
        )
      `)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Eliminar una suscripción
const deleteSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('subscription')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear sesión de checkout para Stripe
const createCheckoutSession = async (req, res) => {
  try {
    const { plan_id } = req.body;
    const user_id = req.user.id;

    if (!plan_id) {
      return res.status(400).json({ message: 'Plan ID is required' });
    }

    // Verificar que el plan existe
    const { data: plan, error: planError } = await supabase
      .from('plan')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    // Verificar si ya existe una suscripción activa
    const { data: existingSubscription } = await supabase
      .from('subscription')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      return res.status(400).json({ message: 'User already has an active subscription' });
    }

    // Crear la suscripción en estado pendiente
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscription')
      .insert([{
        user_id,
        plan_id,
        status: 'pending',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }])
      .select()
      .single();

    if (subscriptionError) throw subscriptionError;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: req.user.email, // Assuming user email is available
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: plan.name,
            description: `Subscription to ${plan.name} plan`
          },
          unit_amount: Math.round(plan.price * 100), // Ensure integer amount
          recurring: {
            interval: 'month'
          }
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      metadata: {
        subscription_id: subscription.id,
        user_id: user_id
      }
    });

    // Update subscription with Stripe session ID
    const { error: updateError } = await supabase
      .from('subscription')
      .update({ stripe_session_id: session.id })
      .eq('id', subscription.id);

    if (updateError) throw updateError;

    res.json({
      subscription_id: subscription.id,
      checkout_url: session.url
    });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ 
      message: 'Error creating checkout session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Verificar estado del pago
const verifyPaymentStatus = async (req, res) => {
  try {
    const user_id = req.user.id;
    
    // Obtener la última suscripción del usuario
    const { data: subscription, error } = await supabase
      .from('subscription')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    if (!subscription) {
      return res.status(404).json({ message: 'No subscription found' });
    }

    res.json({
      status: subscription.status,
      subscription_id: subscription.id
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cancelar suscripción
const cancelSubscription = async (req, res) => {
  try {
    const user_id = req.user.id;
    
    // Obtener la suscripción activa del usuario
    const { data: subscription, error: findError } = await supabase
      .from('subscription')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .single();

    if (findError || !subscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    // Actualizar el estado de la suscripción
    const { error: updateError } = await supabase
      .from('subscription')
      .update({
        status: 'cancelled',
        end_date: new Date().toISOString()
      })
      .eq('id', subscription.id);

    if (updateError) throw updateError;

    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener estado de suscripción
const getSubscriptionStatus = async (req, res) => {
  try {
    const user_id = req.user.id;

    const { data: subscription, error } = await supabase
      .from('subscription')
      .select(`
        *,
        plan:plan_id (
          name,
          price
        )
      `)
      .eq('user_id', user_id)
      .eq('status', 'active')
      .single();

    if (error) throw error;

    if (!subscription) {
      return res.json({
        active: false,
        message: 'No active subscription'
      });
    }

    // Verificar si la suscripción ha expirado
    const endDate = new Date(subscription.end_date);
    const isExpired = endDate < new Date();

    if (isExpired) {
      // Actualizar el estado a expirado
      await supabase
        .from('subscription')
        .update({ status: 'expired' })
        .eq('id', subscription.id);

      return res.json({
        active: false,
        message: 'Subscription expired',
        expiration_date: subscription.end_date
      });
    }

    res.json({
      active: true,
      subscription_details: {
        plan_name: subscription.plan.name,
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        status: subscription.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllPlans,
  createPlan,
  deletePlan,
  getAllSubscriptions,
  getSubscription,
  updateSubscription,
  deleteSubscription,
  createCheckoutSession,
  verifyPaymentStatus,
  cancelSubscription,
  getSubscriptionStatus
};
