const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Función auxiliar para obtener el tipo de perfil del usuario
async function getUserProfileType(user_id) {
  try {
    // Verificar en athlete
    let { data, error } = await supabase
      .from('athlete')
      .select('id, name, last_name, sport_id, location_id, phone_number, ig_user, x_user')
      .eq('user_id', user_id)
      .single();
    
    if (data && !error) return { type: 'athlete', profile: data };

    // Verificar en team
    ({ data, error } = await supabase
      .from('team')
      .select('id, name, sport_id, location_id, phone_number, ig_user, x_user')
      .eq('user_id', user_id)
      .single());
    
    if (data && !error) return { type: 'team', profile: data };

    // Verificar en agent
    ({ data, error } = await supabase
      .from('agent')
      .select('id, name, last_name, sport_id, location_id, phone_number, ig_user, x_user')
      .eq('user_id', user_id)
      .single());
    
    if (data && !error) return { type: 'agent', profile: data };

    throw new Error('Perfil no encontrado');
  } catch (error) {
    throw new Error(`Error obteniendo perfil: ${error.message}`);
  }
}

// Función auxiliar para verificar límite de swipes
async function checkSwipeLimit(user_id) {
  try {
    // 1. Verificar si tiene suscripción activa
    const { data: subscription } = await supabase
      .from('subscription')
      .select('id, status, plan:plan_id(name)')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .single();

    // Usuario con plan activo = swipes ilimitados
    if (subscription) {
      return { allowed: true, remaining: null, is_premium: true };
    }

    // 2. Contar swipes del usuario en las últimas 24 horas
    const { count, error } = await supabase
      .from('swipes')
      .select('*', { count: 'exact', head: true })
      .eq('swiper_user_id', user_id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const remaining = Math.max(0, 10 - count);

    return { 
      allowed: remaining > 0, 
      remaining, 
      is_premium: false 
    };
  } catch (error) {
    console.error('Error checking swipe limit:', error);
    throw error;
  }
}

// Función auxiliar para verificar si el usuario tiene suscripción premium
async function isPremiumUser(user_id) {
  try {
    const { data: subscription } = await supabase
      .from('subscription')
      .select('id')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .gte('end_date', new Date().toISOString())
      .single();

    return !!subscription;
  } catch (error) {
    return false;
  }
}

// Crear o actualizar swipe
const createSwipe = async (req, res) => {
  const { swiped_user_id, action } = req.body;
  const swiper_user_id = req.user.id;

  // Validaciones
  if (!swiped_user_id || !action) {
    return res.status(400).json({ 
      error: 'swiped_user_id y action son requeridos' 
    });
  }

  if (!['like', 'dislike'].includes(action)) {
    return res.status(400).json({ 
      error: 'action debe ser "like" o "dislike"' 
    });
  }

  if (swiper_user_id === swiped_user_id) {
    return res.status(400).json({ 
      error: 'No puedes dar like/dislike a ti mismo' 
    });
  }

  try {
    // ✅ NUEVA VALIDACIÓN: Verificar límite de swipes
    const swipeLimit = await checkSwipeLimit(swiper_user_id);
    
    if (!swipeLimit.allowed) {
      return res.status(403).json({
        error: 'Daily swipe limit reached',
        message: 'Límite diario de swipes alcanzado. Mejora a premium para swipes ilimitados.',
        remaining: swipeLimit.remaining,
        requires_subscription: true
      });
    }

    // Verificar que ambos usuarios pertenezcan al mismo deporte
    const swiperProfile = await getUserProfileType(swiper_user_id);
    const swipedProfile = await getUserProfileType(swiped_user_id);

    if (swiperProfile.profile.sport_id !== swipedProfile.profile.sport_id) {
      return res.status(400).json({ 
        error: 'Solo puedes interactuar con usuarios del mismo deporte' 
      });
    }
    // 1. Verificar que no haya interacción previa
    const { data: existingSwipe } = await supabase
      .from('swipes')
      .select('*')
      .eq('swiper_user_id', swiper_user_id)
      .eq('swiped_user_id', swiped_user_id)
      .single();

    if (existingSwipe) {
      return res.status(400).json({ 
        error: 'Ya interactuaste con este usuario' 
      });
    }

    // 2. Registrar el swipe
    const { error: swipeError } = await supabase
      .from('swipes')
      .insert({
        swiper_user_id,
        swiped_user_id,
        action
      });

    if (swipeError) throw swipeError;

    let matchCreated = false;

    // 3. Si es like, verificar si hay match
    if (action === 'like') {
      const { data: reciprocalLike } = await supabase
        .from('swipes')
        .select('*')
        .eq('swiper_user_id', swiped_user_id)
        .eq('swiped_user_id', swiper_user_id)
        .eq('action', 'like')
        .single();

      if (reciprocalLike) {
        // ¡HAY MATCH! Crear registro
        const { data: activeState } = await supabase
          .from('match_state')
          .select('id')
          .eq('state', 'active')
          .single();

        if (!activeState) {
          throw new Error('Estado de match activo no encontrado');
        }

        const { error: matchError } = await supabase
          .from('match')
          .insert({
            user1_id: Math.min(swiper_user_id, swiped_user_id),
            user2_id: Math.max(swiper_user_id, swiped_user_id),
            match_state_id: activeState.id
          });

        if (matchError) throw matchError;
        matchCreated = true;
      }
    }

    res.status(201).json({ 
      success: true,
      match: matchCreated,
      message: matchCreated ? '¡Match creado!' : 'Swipe registrado',
      swipes_remaining: swipeLimit.remaining,
      is_premium: swipeLimit.is_premium
    });

  } catch (error) {
    console.error('Error en createSwipe:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
};

// Obtener usuarios para descubrir (discover)
const getDiscoverUsers = async (req, res) => {
  const user_id = req.user.id;
  const { profile_type_filter, limit = 10 } = req.query;

  try {
    // 1. Obtener el tipo de perfil del usuario actual
    const userProfile = await getUserProfileType(user_id);
    const userSportId = userProfile.profile.sport_id;
    
    // ✅ NUEVA VALIDACIÓN: Verificar si puede usar filtros avanzados
    if (profile_type_filter && userProfile.type === 'athlete') {
      const isPremium = await isPremiumUser(user_id);
      
      if (!isPremium) {
        return res.status(403).json({
          error: 'Advanced filters require premium subscription',
          message: 'Los filtros avanzados requieren una suscripción premium',
          requires_subscription: true,
          feature: 'profile_type_filters'
        });
      }

      // Validar que los tipos solicitados sean válidos
      const validTypes = ['team', 'agent', 'both'];
      if (!validTypes.includes(profile_type_filter)) {
        return res.status(400).json({
          error: 'Invalid profile type filter',
          valid_types: validTypes
        });
      }
    }

    // 2. Definir qué tipos puede ver según las reglas
    let allowedTypes = [];
    if (userProfile.type === 'athlete') {
      if (profile_type_filter === 'team') {
        allowedTypes = ['team'];
      } else if (profile_type_filter === 'agent') {
        allowedTypes = ['agent'];
      } else {
        allowedTypes = ['team', 'agent']; // both o sin filtro
      }
    } else if (userProfile.type === 'team' || userProfile.type === 'agent') {
      allowedTypes = ['athlete'];
    }

    // 3. Obtener usuarios ya vistos (con swipe)
    const { data: swipedUsers } = await supabase
      .from('swipes')
      .select('swiped_user_id')
      .eq('swiper_user_id', user_id);

    const swipedUserIds = swipedUsers ? swipedUsers.map(s => s.swiped_user_id) : [];

    // 4. Construir array de usuarios disponibles
    let availableUsers = [];

    for (const profileType of allowedTypes) {
      let query = supabase
        .from(profileType)
        .select(`
          *,
          user:user_id(id, created_at),
          sport:sport(name),
          location:location(country, province, city)
        `)
        .not('user_id', 'eq', user_id)
        .eq('sport_id', userSportId); // FILTRO OBLIGATORIO POR DEPORTE

      // Excluir usuarios ya vistos
      if (swipedUserIds.length > 0) {
        query = query.not('user_id', 'in', `(${swipedUserIds.join(',')})`);
      }

      const { data, error } = await query.limit(parseInt(limit));
      
      if (error) throw error;

      if (data) {
        const usersWithType = data.map(user => ({
          ...user,
          profile_type: profileType
        }));
        availableUsers = [...availableUsers, ...usersWithType];
      }
    }

    // 5. Mezclar y limitar resultados
    const shuffled = availableUsers.sort(() => 0.5 - Math.random());
    const limitedUsers = shuffled.slice(0, parseInt(limit));

    res.json({
      success: true,
      users: limitedUsers,
      user_profile_type: userProfile.type,
      user_sport_id: userSportId,
      count: limitedUsers.length
    });

  } catch (error) {
    console.error('Error en getDiscoverUsers:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
};

// Obtener matches del usuario
const getUserMatches = async (req, res) => {
  const user_id = req.user.id;

  try {
    const { data: matches, error } = await supabase
      .from('match')
      .select(`
        *,
        match_state!inner(*),
        user1:users!match_user1_id_fkey(
          id, 
          athlete(*),
          team(*),
          agent(*)
        ),
        user2:users!match_user2_id_fkey(
          id,
          athlete(*),
          team(*),
          agent(*)
        )
      `)
      .or(`user1_id.eq.${user_id},user2_id.eq.${user_id}`)
      .eq('match_state.state', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Procesar matches para mostrar el otro usuario
    const processedMatches = matches.map(match => {
      const otherUser = match.user1_id === user_id ? match.user2 : match.user1;
      
      // Determinar tipo de perfil del otro usuario
      let otherProfile = null;
      let profileType = null;

      if (otherUser.athlete && otherUser.athlete.length > 0) {
        otherProfile = otherUser.athlete[0];
        profileType = 'athlete';
      } else if (otherUser.team && otherUser.team.length > 0) {
        otherProfile = otherUser.team[0];
        profileType = 'team';
      } else if (otherUser.agent && otherUser.agent.length > 0) {
        otherProfile = otherUser.agent[0];
        profileType = 'agent';
      }

      return {
        match_id: match.id,
        created_at: match.created_at,
        other_user: {
          id: otherUser.id,
          profile_type: profileType,
          profile: otherProfile
        }
      };
    });

    res.json({
      success: true,
      matches: processedMatches,
      count: processedMatches.length
    });

  } catch (error) {
    console.error('Error en getUserMatches:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
};

// ✅ NUEVO ENDPOINT: Obtener estadísticas de swipes
const getSwipeStats = async (req, res) => {
  try {
    const user_id = req.user.id;
    
    const stats = await checkSwipeLimit(user_id);
    
    res.json({
      swipes_remaining: stats.remaining,
      is_premium: stats.is_premium,
      daily_limit: 10
    });
  } catch (error) {
    console.error('Error getting swipe stats:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
};

// ✅ NUEVO ENDPOINT: Contacto directo (solo premium)
const getDirectContact = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { target_user_id } = req.params;

    // 1. Verificar suscripción activa
    const isPremium = await isPremiumUser(user_id);

    if (!isPremium) {
      return res.status(403).json({
        error: 'Direct contact requires premium subscription',
        message: 'El contacto directo requiere una suscripción premium',
        requires_subscription: true,
        feature: 'direct_contact'
      });
    }

    // 2. Validar que ambos usuarios estén en el mismo deporte
    const userProfile = await getUserProfileType(user_id);
    const targetProfile = await getUserProfileType(target_user_id);

    if (!userProfile.profile || !targetProfile.profile) {
      return res.status(404).json({ 
        error: 'User profile not found',
        message: 'Perfil de usuario no encontrado'
      });
    }

    if (userProfile.profile.sport_id !== targetProfile.profile.sport_id) {
      return res.status(400).json({ 
        error: 'Same sport required',
        message: 'Solo puedes contactar usuarios del mismo deporte' 
      });
    }

    // 3. Obtener información de contacto
    const { data: targetUser, error } = await supabase
      .from('users')
      .select('email')
      .eq('id', target_user_id)
      .single();

    if (error || !targetUser) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'Usuario no encontrado'
      });
    }

    res.json({
      contact_info: {
        email: targetUser.email,
        phone: targetProfile.profile.phone_number,
        instagram: targetProfile.profile.ig_user,
        twitter: targetProfile.profile.x_user
      },
      profile_type: targetProfile.type,
      name: targetProfile.profile.name,
      last_name: targetProfile.profile.last_name || null
    });

  } catch (error) {
    console.error('Error getting direct contact:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
};

module.exports = {
  createSwipe,
  getDiscoverUsers,
  getUserMatches,
  getSwipeStats,
  getDirectContact
};