const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

const signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verificar si el usuario ya existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario con role 'user' por defecto
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password: hashedPassword,
          role: 'user' // siempre será 'user' por defecto
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Generar token
    const token = generateToken(newUser);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener los campos requeridos según el tipo de perfil
const getProfileRequirements = (profileType) => {
  const requirements = {
    athlete: [
      'name',
      'last_name',
      'birthdate',
      'height',
      'weight',
      'location_id',
      'sport_id', 
      'phone_number',
      'ig_user',
      'x_user',
      'description'
    ],
    agent: [
      'name',
      'last_name',
      'description',
      'location_id',
      'sport_id',
      'phone_number',
      'ig_user',
      'x_user',
      'agency'
    ],
    team: [
      'name',
      'job',
      'description',
      'sport_id',
      'location_id',
      'phone_number',
      'ig_user',
      'x_user'
    ]
  };

  return requirements[profileType] || [];
};

const completeProfile = async (req, res) => {
  try {
    const { profileType, ...profileData } = req.body;
    
    // Validar tipo de perfil
    if (!['athlete', 'agent', 'team'].includes(profileType)) {
      return res.status(400).json({ 
        message: 'Invalid profile type. Must be athlete, agent, or team',
        validTypes: ['athlete', 'agent', 'team']
      });
    }

    // Verificar que se proporcionaron todos los campos requeridos
    const requiredFields = getProfileRequirements(profileType);
    const missingFields = requiredFields.filter(field => !profileData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: 'Missing required fields',
        missingFields,
        requiredFields
      });
    }

    // Validar que location_id existe
    const { data: location } = await supabase
      .from('location')
      .select('id')
      .eq('id', profileData.location_id)
      .single();

    if (!location) {
      return res.status(400).json({
        message: 'Invalid location_id'
      });
    }

    // Validar que sport_id existe (requerido para todos los tipos de perfil)
    const { data: sport } = await supabase
      .from('sport')
      .select('id')
      .eq('id', profileData.sport_id)
      .single();

    if (!sport) {
      return res.status(400).json({
        message: 'Invalid sport_id'
      });
    }

    // Verificar que el usuario no tenga ya un perfil
    const { data: existingProfile } = await supabase
      .from(profileType)
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (existingProfile) {
      return res.status(400).json({
        message: `User already has a ${profileType} profile`
      });
    }

    // Insertar el perfil
    const { data: profile, error: profileError } = await supabase
      .from(profileType)
      .insert([{ ...profileData, user_id: req.user.id }])
      .select(`
        *,
        location:location_id (*),
        sport:sport_id (*)
      `)
      .single();

    if (profileError) throw profileError;

    res.status(200).json({
      message: 'Profile completed successfully',
      profileType,
      profile
    });
  } catch (error) {
    console.error('Complete profile error:', error);
    res.status(500).json({ message: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generar token
    const token = generateToken(user);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const { email } = ticket.getPayload();

    // Buscar o crear usuario
    let { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) {
      // Crear nuevo usuario con Google
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            email,
            password: null, // Usuario de Google no tiene contraseña
            role: 'user' // Role será 'user' por defecto
          }
        ])
        .select()
        .single();

      if (createError) throw createError;
      user = newUser;

      // Verificar si el usuario tiene algún perfil
      const profiles = await Promise.all([
        supabase.from('athlete').select('*').eq('user_id', user.id).single(),
        supabase.from('agent').select('*').eq('user_id', user.id).single(),
        supabase.from('team').select('*').eq('user_id', user.id).single()
      ]);

      const hasProfile = profiles.some(profile => profile.data !== null);

      // Generar token
      const jwtToken = generateToken(user);

      // Si es un usuario nuevo, indicar que necesita completar el perfil
      return res.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        token: jwtToken,
        requiresProfile: true,
        profileTypes: {
          available: ['athlete', 'agent', 'team'],
          requirements: {
            athlete: getProfileRequirements('athlete'),
            agent: getProfileRequirements('agent'),
            team: getProfileRequirements('team')
          }
        }
      });
    }

    // Para usuarios existentes
    // Verificar si el usuario ya tiene un perfil
    const profiles = await Promise.all([
      supabase.from('athlete').select('*').eq('user_id', user.id).single(),
      supabase.from('agent').select('*').eq('user_id', user.id).single(),
      supabase.from('team').select('*').eq('user_id', user.id).single()
    ]);

    const existingProfile = profiles.find(profile => profile.data !== null);
    const jwtToken = generateToken(user);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      token: jwtToken,
      requiresProfile: !existingProfile,
      ...(existingProfile && {
        profile: {
          type: profiles.findIndex(p => p.data !== null) === 0 ? 'athlete' :
                profiles.findIndex(p => p.data !== null) === 1 ? 'agent' : 'team',
          data: existingProfile.data
        }
      }),
      ...(!existingProfile && {
        profileTypes: {
          available: ['athlete', 'agent', 'team'],
          requirements: {
            athlete: getProfileRequirements('athlete'),
            agent: getProfileRequirements('agent'),
            team: getProfileRequirements('team')
          }
        }
      })
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  signup,
  login,
  googleLogin,
  completeProfile
};
