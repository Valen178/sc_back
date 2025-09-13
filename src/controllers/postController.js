const { createClient } = require('@supabase/supabase-js');
const { getUser } = require('./adminController');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Obtener todas las publicaciones
const getAllPosts = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('post')
      .select(`
        *,
        user:user_id (
          id,
          email,
          role
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Obtener una publicación específica
const getPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('post')
      .select(`
        *,
        user:user_id (
          id,
          email,
          role
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Eliminar una publicación
const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('post')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createPost = async (req, res) => {
  try {
    const { text, url } = req.body;
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('post')
      .insert([ { text, url, user_id: userId } ])
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Post created successfully', post: data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } 
};

// Obtener publicaciones del usuario autenticado
const getUserPosts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { data, error } = await supabase
      .from('post')
      .select('*')  
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({message: 'User posts retrieved successfully', post: data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } 
};

module.exports = {
  createPost, 
  getAllPosts,
  getPost,
  deletePost,
  getUserPosts
};
