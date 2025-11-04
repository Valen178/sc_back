const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const getProfileByUserId = async (userId) => {
  // Buscar en todas las tablas de perfil
  const [athleteProfile, agentProfile, teamProfile] = await Promise.all([
    supabase.from('athlete').select('*, location:location_id(*), sport:sport_id(*)').eq('user_id', userId).single(),
    supabase.from('agent').select('*, location:location_id(*), sport:sport_id(*)').eq('user_id', userId).single(),
    supabase.from('team').select('*, location:location_id(*), sport:sport_id(*)').eq('user_id', userId).single()
  ]);

  // Determinar qué tipo de perfil tiene
  if (athleteProfile.data) return { type: 'athlete', profile: athleteProfile.data };
  if (agentProfile.data) return { type: 'agent', profile: agentProfile.data };
  if (teamProfile.data) return { type: 'team', profile: teamProfile.data };

  return null;
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id; // ID del usuario autenticado
    const { userUpdates = {}, profileUpdates = {} } = req.body;

    // Eliminar campos que no se deben actualizar
    delete profileUpdates.id;
    delete profileUpdates.user_id;
    delete profileUpdates.created_at;
    delete userUpdates.id;
    delete userUpdates.created_at;
    delete userUpdates.role; // No permitir cambiar el rol

    // Si se proporciona una nueva contraseña, hashearla
    if (userUpdates.password) {
      userUpdates.password = await bcrypt.hash(userUpdates.password, 10);
    }

    // Obtener el tipo de perfil actual del usuario
    const currentProfile = await getProfileByUserId(userId);

    if (!currentProfile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Validar que location_id existe si se está actualizando
    if (profileUpdates.location_id) {
      const { data: location } = await supabase
        .from('location')
        .select('id')
        .eq('id', profileUpdates.location_id)
        .single();

      if (!location) {
        return res.status(400).json({
          message: 'Invalid location_id'
        });
      }
    }

    // Validar que sport_id existe si se está actualizando
    if (profileUpdates.sport_id) {
      const { data: sport } = await supabase
        .from('sport')
        .select('id')
        .eq('id', profileUpdates.sport_id)
        .single();

      if (!sport) {
        return res.status(400).json({
          message: 'Invalid sport_id'
        });
      }
    }

    // Actualizar el perfil y la información de usuario
    const [profileResult, userResult] = await Promise.all([
      // Actualizar perfil si hay cambios
      Object.keys(profileUpdates).length > 0 
        ? supabase
            .from(currentProfile.type)
            .update(profileUpdates)
            .eq('user_id', userId)
            .select(`*, location:location_id (*), sport:sport_id (*)`)
            .single()
        : { data: currentProfile.profile },
      
      // Actualizar usuario si hay cambios
      Object.keys(userUpdates).length > 0
        ? supabase
            .from('users')
            .update(userUpdates)
            .eq('id', userId)
            .select('id, email, role')
            .single()
        : supabase
            .from('users')
            .select('id, email, role')
            .eq('id', userId)
            .single()
    ]);

    if (profileResult.error) throw profileResult.error;
    if (userResult.error) throw userResult.error;

    res.json({
      message: 'Profile updated successfully',
      profile: profileResult.data,
      user: userResult.data
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: error.message });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener perfil y datos de usuario
    const [profile, userData] = await Promise.all([
      getProfileByUserId(userId),
      supabase
        .from('users')
        .select('id, email, role')
        .eq('id', userId)
        .single()
    ]);

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    if (userData.error) throw userData.error;

    res.json({
      user: userData.data,
      profileType: profile.type,
      profile: profile.profile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: error.message });
  }
};

const deleteMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener el tipo de perfil actual
    const currentProfile = await getProfileByUserId(userId);
    
    if (!currentProfile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Eliminar el perfil según su tipo
    let deleteError;
    
    switch (currentProfile.type) {
      case 'athlete':
        const { error: athleteError } = await supabase
          .from('athlete')
          .delete()
          .eq('user_id', userId);
        deleteError = athleteError;
        break;
      case 'agent':
        const { error: agentError } = await supabase
          .from('agent')
          .delete()
          .eq('user_id', userId);
        deleteError = agentError;
        break;
      case 'team':
        const { error: teamError } = await supabase
          .from('team')
          .delete()
          .eq('user_id', userId);
        deleteError = teamError;
        break;
    }

    if (deleteError) throw deleteError;

    // Eliminar el usuario
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (userError) throw userError;

    res.json({ message: 'Profile and user deleted successfully' });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Obtener perfil de otro usuario (para ver perfiles en matches/discover)
const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.id; // Usuario que hace la petición

    // No permitir ver tu propio perfil con este endpoint
    if (parseInt(userId) === requesterId) {
      return res.status(400).json({ 
        message: 'Use GET /profile/me to view your own profile' 
      });
    }

    // Verificar que el usuario solicitado existe
    const { data: targetUser, error: userError } = await supabase
      .from('users')
      .select('id, created_at')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Obtener el perfil del usuario solicitado
    const profile = await getProfileByUserId(userId);

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Opcional: Verificar si existe interacción (swipe o match)
    // Esto añade una capa de privacidad - solo puedes ver perfiles con los que interactuaste
    const { data: interaction } = await supabase
      .from('swipes')
      .select('*')
      .or(`and(swiper_user_id.eq.${requesterId},swiped_user_id.eq.${userId}),and(swiper_user_id.eq.${userId},swiped_user_id.eq.${requesterId})`)
      .limit(1);

    // Verificar si hay match activo
    const { data: match } = await supabase
      .from('match')
      .select('*, match_state!inner(*)')
      .or(`and(user1_id.eq.${Math.min(requesterId, userId)},user2_id.eq.${Math.max(requesterId, userId)})`)
      .eq('match_state.state', 'active')
      .single();

    // Información de contexto sobre la relación
    const relationshipContext = {
      has_interaction: interaction && interaction.length > 0,
      has_match: !!match,
      can_view_full_profile: !!match || (interaction && interaction.length > 0)
    };

    // Si no hay interacción, retornar perfil limitado (básico)
    if (!relationshipContext.has_interaction) {
      return res.json({
        user_id: targetUser.id,
        profile_type: profile.type,
        profile: {
          name: profile.profile.name,
          photo_url: profile.profile.photo_url || null,
          sport: profile.profile.sport,
          location: profile.profile.location,
          description: profile.profile.description || null
        },
        relationship: relationshipContext,
        limited_view: true
      });
    }

    // Si hay interacción o match, retornar perfil completo
    res.json({
      user_id: targetUser.id,
      profile_type: profile.type,
      profile: profile.profile,
      relationship: relationshipContext,
      limited_view: false
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMyProfile,
  updateProfile,
  deleteMyProfile,
  getUserProfile
};
