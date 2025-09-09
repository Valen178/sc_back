const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// === DEPORTES ===

// Obtener todos los deportes
const getAllSports = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('sport')
      .select('*')
      .order('name');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener un deporte específico
const getSport = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('sport')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Sport not found' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear un deporte
const createSport = async (req, res) => {
  try {
    const { name, position } = req.body;

    // Validar campos requeridos
    if (!name || !position) {
      return res.status(400).json({ 
        message: 'Name and position are required',
        missingFields: [
          !name && 'name',
          !position && 'position'
        ].filter(Boolean)
      });
    }

    const { data, error } = await supabase
      .from('sport')
      .insert([{
        name,
        position
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ message: 'Sport with this name already exists' });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Actualizar un deporte
const updateSport = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, position } = req.body;

    const { data, error } = await supabase
      .from('sport')
      .update({ name, position })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Sport not found' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Eliminar un deporte
const deleteSport = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('sport')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Sport deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// === UBICACIONES ===

// Obtener todas las ubicaciones
const getAllLocations = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('location')
      .select('*')
      .order('country', { ascending: true })
      .order('province', { ascending: true })
      .order('city', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener una ubicación específica
const getLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('location')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Location not found' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Crear una ubicación
const createLocation = async (req, res) => {
  try {
    const { country, province, city } = req.body;

    // Validar campos requeridos
    if (!country || !province || !city) {
      return res.status(400).json({ 
        message: 'Country, province and city are required',
        missingFields: [
          !country && 'country',
          !province && 'province',
          !city && 'city'
        ].filter(Boolean)
      });
    }

    const { data, error } = await supabase
      .from('location')
      .insert([{
        country,
        province,
        city
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ 
          message: 'Location with this combination of country, city and name already exists' 
        });
      }
      throw error;
    }

    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Actualizar una ubicación
const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { country, province, city } = req.body;

    const { data, error } = await supabase
      .from('location')
      .update({ country, province, city })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Location not found' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Eliminar una ubicación
const deleteLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('location')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  // Deportes
  getAllSports,
  getSport,
  createSport,
  updateSport,
  deleteSport,
  
  // Ubicaciones
  getAllLocations,
  getLocation,
  createLocation,
  updateLocation,
  deleteLocation
};
