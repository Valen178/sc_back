const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(403).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', req.user.id)
      .single();

    if (user?.role !== 'admin') {
      return res.status(403).json({ message: 'Requires admin privileges' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: 'Error verifying admin role' });
  }
};

// Middleware para verificar si el usuario puede acceder a un recurso específico
const canAccessResource = (req, res, next) => {
  const userId = req.user.id;
  const resourceUserId = req.params.userId || req.body.user_id;

  // Si es admin o es el propio recurso del usuario, permite el acceso
  if (req.user.role === 'admin' || userId === resourceUserId) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied' });
  }
};

module.exports = { verifyToken, isAdmin, canAccessResource };
