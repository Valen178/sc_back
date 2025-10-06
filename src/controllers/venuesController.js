const supabase = require('../config/supabase');
const { Client } = require('@googlemaps/google-maps-services-js');
const client = new Client({});

const getNearbyVenues = async (req, res) => {
    try {
        const { lat, lng, sport_id } = req.query;
        const radius = 5000; // 5km

        if (!lat || !lng) {
            return res.status(400).json({
                message: "Latitude and longitude are required"
            });
        }

        // Primero buscar en cache
        const { data: cachedVenues, error: cacheError } = await supabase
            .from('sports_venues')
            .select('*')
            .eq('is_active', true)
            .eq(sport_id ? 'sport_id' : true, sport_id || true)
            .filter('last_updated', 'gte', new Date(Date.now() - 24 * 60 * 60 * 1000)); // Datos de último día

        if (cacheError) throw cacheError;

        if (cachedVenues?.length > 0) {
            return res.json({
                message: "Venues retrieved successfully",
                data: cachedVenues
            });
        }

        // Si no hay datos en cache o están desactualizados, buscar en Google Places
        const response = await client.placesNearby({
            params: {
                location: { lat: parseFloat(lat), lng: parseFloat(lng) },
                radius,
                type: ['gym', 'stadium', 'sports_complex'],
                key: process.env.GOOGLE_MAPS_API_KEY
            }
        });

        const venues = response.data.results;
        
        // Obtener detalles y guardar en cache
        const venuesWithDetails = await Promise.all(
            venues.map(async venue => {
                const details = await client.placeDetails({
                    params: {
                        place_id: venue.place_id,
                        fields: ['name', 'formatted_address', 'geometry', 'opening_hours', 'photos', 'rating', 'website', 'formatted_phone_number'],
                        key: process.env.GOOGLE_MAPS_API_KEY
                    }
                });

                const venueData = {
                    place_id: venue.place_id,
                    name: venue.name,
                    address: venue.formatted_address || venue.vicinity,
                    lat: venue.geometry.location.lat,
                    lng: venue.geometry.location.lng,
                    sport_id: sport_id || null,
                    phone: details.data.result.formatted_phone_number,
                    website: details.data.result.website,
                    rating: venue.rating,
                    opening_hours: details.data.result.opening_hours,
                    photo_reference: details.data.result.photos?.[0]?.photo_reference,
                    last_updated: new Date(),
                    is_active: true
                };

                // Guardar en cache
                const { error: insertError } = await supabase
                    .from('sports_venues')
                    .upsert(venueData, {
                        onConflict: 'place_id',
                        returning: true
                    });

                if (insertError) throw insertError;

                return venueData;
            })
        );

        res.json({
            message: "Venues retrieved successfully",
            data: venuesWithDetails
        });

    } catch (error) {
        console.error('Error getting venues:', error);
        res.status(500).json({
            message: "Error retrieving venues",
            error: error.message
        });
    }
};

const getVenueDetails = async (req, res) => {
    try {
        const { placeId } = req.params;

        // Buscar en cache
        const { data: cachedVenue, error: cacheError } = await supabase
            .from('sports_venues')
            .select('*')
            .eq('place_id', placeId)
            .eq('is_active', true)
            .single();

        if (cacheError) throw cacheError;

        if (cachedVenue) {
            return res.json({
                message: "Venue details retrieved successfully",
                data: cachedVenue
            });
        }

        // Si no está en cache, buscar en Google Places
        const details = await client.placeDetails({
            params: {
                place_id: placeId,
                fields: ['name', 'formatted_address', 'geometry', 'opening_hours', 'photos', 'rating', 'website', 'formatted_phone_number'],
                key: process.env.GOOGLE_MAPS_API_KEY
            }
        });

        const venueData = {
            place_id: placeId,
            name: details.data.result.name,
            address: details.data.result.formatted_address,
            lat: details.data.result.geometry.location.lat,
            lng: details.data.result.geometry.location.lng,
            phone: details.data.result.formatted_phone_number,
            website: details.data.result.website,
            rating: details.data.result.rating,
            opening_hours: details.data.result.opening_hours,
            photo_reference: details.data.result.photos?.[0]?.photo_reference,
            last_updated: new Date(),
            is_active: true
        };

        // Guardar en cache
        const { error: insertError } = await supabase
            .from('sports_venues')
            .upsert(venueData, {
                onConflict: 'place_id',
                returning: true
            });

        if (insertError) throw insertError;

        res.json({
            message: "Venue details retrieved successfully",
            data: venueData
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
    getNearbyVenues,
    getVenueDetails
};