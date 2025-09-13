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
      .select('id, name, last_name, sport_id, location_id')
      .eq('user_id', user_id)
      .single();
    
    if (data && !error) return { type: 'athlete', profile: data };

    // Verificar en team
    ({ data, error } = await supabase
      .from('team')
      .select('id, name, sport_id, location_id')
      .eq('user_id', user_id)
      .single());
    
    if (data && !error) return { type: 'team', profile: data };

    // Verificar en agent
    ({ data, error } = await supabase
      .from('agent')
      .select('id, name, last_name, sport_id, location_id')
      .eq('user_id', user_id)
      .single());
    
    if (data && !error) return { type: 'agent', profile: data };

    throw new Error('Perfil no encontrado');
  } catch (error) {
    throw new Error(`Error obteniendo perfil: ${error.message}`);
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
      message: matchCreated ? '¡Match creado!' : 'Swipe registrado'
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
    
    // 2. Definir qué tipos puede ver según las reglas
    let allowedTypes = [];
    if (userProfile.type === 'athlete') {
      if (profile_type_filter === 'team') {
        allowedTypes = ['team'];
      } else if (profile_type_filter === 'agent') {
        allowedTypes = ['agent'];
      } else {
        allowedTypes = ['team', 'agent']; // ambos o sin filtro
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
          user:users!${profileType}_user_id_fkey(id, created_at),
          sport:sport(name),
          location:location(country, province, city)
        `)
        .not('user_id', 'eq', user_id);

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

// Obtener estadísticas de swipes del usuario
const getSwipeStats = async (req, res) => {
  const user_id = req.user.id;

  try {
    // Swipes enviados
    const { data: sentSwipes, error: sentError } = await supabase
      .from('swipes')
      .select('action')
      .eq('swiper_user_id', user_id);

    if (sentError) throw sentError;

    // Swipes recibidos
    const { data: receivedSwipes, error: receivedError } = await supabase
      .from('swipes')
      .select('action')
      .eq('swiped_user_id', user_id);

    if (receivedError) throw receivedError;

    // Matches
    const { data: matches, error: matchError } = await supabase
      .from('match')
      .select('id')
      .or(`user1_id.eq.${user_id},user2_id.eq.${user_id}`);

    if (matchError) throw matchError;

    const stats = {
      sent: {
        total: sentSwipes ? sentSwipes.length : 0,
        likes: sentSwipes ? sentSwipes.filter(s => s.action === 'like').length : 0,
        dislikes: sentSwipes ? sentSwipes.filter(s => s.action === 'dislike').length : 0
      },
      received: {
        total: receivedSwipes ? receivedSwipes.length : 0,
        likes: receivedSwipes ? receivedSwipes.filter(s => s.action === 'like').length : 0,
        dislikes: receivedSwipes ? receivedSwipes.filter(s => s.action === 'dislike').length : 0
      },
      matches: matches ? matches.length : 0
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error en getSwipeStats:', error);
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
  getSwipeStats
};