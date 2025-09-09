const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Obtener todos los usuarios
const getAllUsers = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*, athlete(*), agent(*), team(*)');

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener un usuario específico
const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('users')
      .select('*, athlete(*), agent(*), team(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Actualizar un usuario
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Actualizar usuario base
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Eliminar un usuario
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Primero eliminamos los registros relacionados según el rol
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', id)
      .single();

    if (user) {
      switch (user.role) {
        case 'athlete':
          await supabase.from('athlete').delete().eq('user_id', id);
          break;
        case 'agent':
          await supabase.from('agent').delete().eq('user_id', id);
          break;
        case 'team':
          await supabase.from('team').delete().eq('user_id', id);
          break;
      }
    }

    // Luego eliminamos el usuario
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cambiar el rol de un usuario (solo entre 'user' y 'admin')
const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validar que el rol sea válido
    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ message: 'Rol inválido. Solo se permiten "user" o "admin"' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
  changeUserRole
};
