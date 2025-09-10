const { createClient } = require('@supabase/supabase-js');

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

module.exports = {
  getAllPlans,
  createPlan,
  deletePlan,
  getAllSubscriptions,
  getSubscription,
  updateSubscription,
  deleteSubscription
};
