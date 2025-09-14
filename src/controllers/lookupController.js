const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Obtener todos los deportes
const getAllSports = async (req, res) => {
  try {
    const { data: sports, error } = await supabase
      .from('sport')
      .select('*')
      .order('name');

    if (error) throw error;

    // Obtener la cantidad de usuarios por deporte
    const { data: usersCount } = await supabase
      .from('athlete')
      .select('sport_id, count(*)')
      .group('sport_id');

    const sportsWithCounts = sports.map(sport => ({
      ...sport,
      athleteCount: usersCount.find(count => count.sport_id === sport.id)?.count || 0
    }));

    res.json(sportsWithCounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener todas las ubicaciones
const getAllLocations = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('location')
      .select('*');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener ubicaciones por país
const getLocationsByCountry = async (req, res) => {
  try {
    const { country } = req.params;
    const { data, error } = await supabase
      .from('location')
      .select('*')
      .eq('country', country);

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllSports,
  getAllLocations,
  getLocationsByCountry
};
