const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Obtener todas las suscripciones
const getAllSubscriptions = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
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
      .from('subscriptions')
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
    const { status, end_date } = req.body;

    // Validar status
    if (status && !['active', 'cancelled', 'expired'].includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status. Must be active, cancelled, or expired'
      });
    }

    // Validar end_date
    if (end_date) {
      const endDate = new Date(end_date);
      if (isNaN(endDate.getTime())) {
        return res.status(400).json({ message: 'Invalid end_date format' });
      }
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update({ status, end_date })
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
      .from('subscriptions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllSubscriptions,
  getSubscription,
  updateSubscription,
  deleteSubscription
};
