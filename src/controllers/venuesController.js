const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Obtener todos los venues activos
const getAllVenues = async (req, res) => {
    try {
        const { data: venues, error } = await supabase
            .from('sports_venues')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) throw error;

        res.json({
            message: "Venues retrieved successfully",
            data: venues || []
        });

    } catch (error) {
        console.error('Error getting venues:', error);
        res.status(500).json({
            message: "Error retrieving venues",
            error: error.message
        });
    }
};

// Obtener detalles de un venue específico por ID
const getVenueById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data: venue, error } = await supabase
            .from('sports_venues')
            .select('*')
            .eq('id', id)
            .eq('is_active', true)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    message: "Venue not found"
                });
            }
            throw error;
        }

        res.json({
            message: "Venue details retrieved successfully",
            data: venue
        });

    } catch (error) {
        console.error('Error getting venue details:', error);
        res.status(500).json({
            message: "Error retrieving venue details",
            error: error.message
        });
    }
};

module.exports = {
    getAllVenues,
    getVenueById
};