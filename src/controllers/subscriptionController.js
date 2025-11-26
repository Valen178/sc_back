const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Obtener planes públicamente (sin autenticación)
const getPublicPlans = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('plan')
      .select('id, name, price')
      .order('price', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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
    const { end_date, status } = req.body;

    // Construir objeto de actualización
    const updateData = {};
    
    if (status) {
      const validStatuses = ['pending', 'active', 'cancelled', 'expired', 'payment_failed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: 'Invalid status', 
          validStatuses 
        });
      }
      updateData.status = status;
    }

    if (end_date) {
      const endDate = new Date(end_date);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({ message: 'Invalid end_date format' });
      }
      updateData.end_date = end_date;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const { data, error } = await supabase
      .from('subscription')
      .update(updateData)
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

    // Validar que plan_id esté presente y sea válido
    if (!plan_id) {
      return res.status(400).json({ message: 'Plan ID is required' });
    }

    // Validar tipo de dato
    if (isNaN(plan_id)) {
      return res.status(400).json({ message: 'Invalid plan ID format' });
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
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 días desde ahora
      }])
      .select()
      .single();

    if (subscriptionError) throw subscriptionError;

    try {
      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        customer_email: req.user.email,
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: plan.name,
              description: `Subscription to ${plan.name} plan`
            },
            unit_amount: Math.round(plan.price * 100),
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
    } catch (stripeError) {
      // Rollback: Eliminar la suscripción si Stripe falla
      await supabase
        .from('subscription')
        .delete()
        .eq('id', subscription.id);

      console.error('Stripe session creation failed:', stripeError);
      throw stripeError;
    }
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
        end_date: new Date().toISOString() // Finaliza inmediatamente
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
        start_date: subscription.created_at, // Usar created_at como inicio
        end_date: subscription.end_date,
        status: subscription.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Webhook de Stripe para manejar eventos de pago
const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Logs para debugging
  console.log('Webhook received');
  console.log('Body type:', typeof req.body);
  console.log('Body is Buffer:', Buffer.isBuffer(req.body));
  console.log('Signature present:', !!sig);
  console.log('Endpoint secret configured:', !!endpointSecret);

  let event;

  try {
    // Verificar la firma del webhook
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log('✅ Webhook signature verified successfully');
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Manejar diferentes tipos de eventos
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        // Pago exitoso - activar suscripción
        const session = event.data.object;
        const subscription_id = session.metadata.subscription_id;
        
        if (subscription_id) {
          const { error } = await supabase
            .from('subscription')
            .update({ 
              status: 'active',
              stripe_subscription_id: session.subscription || null,
              stripe_customer_id: session.customer || null
            })
            .eq('id', subscription_id);

          if (error) {
            console.error('Error updating subscription to active:', error);
          } else {
            console.log(`Subscription ${subscription_id} activated successfully`);
          }
        }
        break;

      case 'customer.subscription.deleted':
        // Suscripción cancelada desde Stripe
        const deletedSubscription = event.data.object;
        const stripeSubId = deletedSubscription.id;

        const { error: deleteError } = await supabase
          .from('subscription')
          .update({ 
            status: 'cancelled',
            end_date: new Date().toISOString() // Finaliza inmediatamente
          })
          .eq('stripe_subscription_id', stripeSubId)
          .eq('status', 'active');

        if (deleteError) {
          console.error('Error cancelling subscription:', deleteError);
        } else {
          console.log(`Subscription ${stripeSubId} cancelled from Stripe`);
        }
        break;

      case 'invoice.payment_failed':
        // Fallo en el pago
        const failedInvoice = event.data.object;
        const failedSubId = failedInvoice.subscription;

        const { error: failError } = await supabase
          .from('subscription')
          .update({ status: 'payment_failed' })
          .eq('stripe_subscription_id', failedSubId);

        if (failError) {
          console.error('Error marking payment as failed:', failError);
        } else {
          console.log(`Payment failed for subscription ${failedSubId}`);
        }
        break;

      case 'invoice.payment_succeeded':
        // Pago exitoso (renovación)
        const successInvoice = event.data.object;
        const renewedSubId = successInvoice.subscription;

        // Extender la fecha de fin de la suscripción por 30 días más
        const newEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const { error: renewError } = await supabase
          .from('subscription')
          .update({ 
            status: 'active',
            end_date: newEndDate
          })
          .eq('stripe_subscription_id', renewedSubId);

        if (renewError) {
          console.error('Error renewing subscription:', renewError);
        } else {
          console.log(`Subscription ${renewedSubId} renewed successfully`);
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
};

// Función para marcar suscripciones expiradas (ejecutar con cron job)
const markExpiredSubscriptions = async (req, res) => {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('subscription')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('end_date', now)
      .select();

    if (error) throw error;

    const count = data ? data.length : 0;
    console.log(`Marked ${count} subscriptions as expired`);

    res.json({ 
      message: `Successfully marked ${count} subscription(s) as expired`,
      expired_subscriptions: data
    });
  } catch (error) {
    console.error('Error marking expired subscriptions:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPublicPlans,
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
  getSubscriptionStatus,
  handleStripeWebhook,
  markExpiredSubscriptions
};
