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
    if (updates.location_id) {
      const { data: location } = await supabase
        .from('location')
        .select('id')
        .eq('id', updates.location_id)
        .single();

      if (!location) {
        return res.status(400).json({
          message: 'Invalid location_id'
        });
      }
    }

    // Validar que sport_id existe si se está actualizando
    if (updates.sport_id) {
      const { data: sport } = await supabase
        .from('sport')
        .select('id')
        .eq('id', updates.sport_id)
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

module.exports = {
  getMyProfile,
  updateProfile,
  deleteMyProfile
};
