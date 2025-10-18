const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Helper para obtener el tipo de perfil del usuario
const getProfileType = async (userId) => {
  const [athleteProfile, agentProfile, teamProfile] = await Promise.all([
    supabase.from('athlete').select('id').eq('user_id', userId).single(),
    supabase.from('agent').select('id').eq('user_id', userId).single(),
    supabase.from('team').select('id').eq('user_id', userId).single()
  ]);

  console.log('Profile check:', { 
    athlete: !!athleteProfile.data, 
    agent: !!agentProfile.data, 
    team: !!teamProfile.data 
  });

  if (athleteProfile.data) return 'athlete';
  if (agentProfile.data) return 'agent';
  if (teamProfile.data) return 'team';

  return null;
};

const uploadProfilePhoto = async (req, res) => {
    try {
        const userId = req.user.id;
        const file = req.file;

        console.log('Upload photo request:', { userId, hasFile: !!file });

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Auto-detectar el tipo de perfil del usuario
        const profileType = await getProfileType(userId);

        if (!profileType) {
            return res.status(400).json({ 
                message: 'Profile not found. Please complete your profile before uploading a photo.',
                hint: 'Use POST /auth/complete-profile to create your profile first',
                requiresProfile: true,
                profileTypes: ['athlete', 'agent', 'team']
            });
        }

        console.log('Profile type detected:', profileType);

        // Upload to Supabase Storage
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${userId}.${fileExt}`;
        
        console.log('Uploading file:', fileName);

        const { error: uploadError } = await supabase
            .storage
            .from('profile_photos')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            throw uploadError;
        }

        // Get public URL
        const { data: publicUrlData } = supabase
            .storage
            .from('profile_photos')
            .getPublicUrl(fileName);

        const publicUrl = publicUrlData.publicUrl;

        console.log('File uploaded successfully:', publicUrl);

        // Update profile with new photo URL
        const { error: updateError } = await supabase
            .from(profileType)
            .update({ photo_url: publicUrl })
            .eq('user_id', userId);

        if (updateError) {
            console.error('Update profile error:', updateError);
            throw updateError;
        }

        console.log('Profile updated with photo URL');

        res.status(200).json({
            message: 'Profile photo uploaded successfully',
            photo_url: publicUrl,
            profileType: profileType
        });

    } catch (error) {
        console.error('Upload photo error:', error);
        res.status(500).json({ 
            message: error.message,
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

const deleteProfilePhoto = async (req, res) => {
    try {
        const userId = req.user.id;

        console.log('Delete photo request for user:', userId);

        // Auto-detectar el tipo de perfil
        const profileType = await getProfileType(userId);

        if (!profileType) {
            return res.status(400).json({ 
                message: 'Profile not found',
                requiresProfile: true
            });
        }

        console.log('Profile type detected:', profileType);

        // Get current photo URL
        const { data: profile } = await supabase
            .from(profileType)
            .select('photo_url')
            .eq('user_id', userId)
            .single();

        if (!profile?.photo_url) {
            return res.status(404).json({ 
                message: 'No profile photo found to delete' 
            });
        }

        console.log('Current photo URL:', profile.photo_url);

        // Extract filename from URL
        const fileName = profile.photo_url.split('/').pop();
        
        console.log('Deleting file:', fileName);

        const { error: deleteError } = await supabase
            .storage
            .from('profile_photos')
            .remove([fileName]);

        if (deleteError) {
            console.error('Delete storage error:', deleteError);
            // Continue even if storage delete fails
        }

        // Update profile to remove photo URL
        const { error: updateError } = await supabase
            .from(profileType)
            .update({ photo_url: null })
            .eq('user_id', userId);

        if (updateError) {
            console.error('Update profile error:', updateError);
            throw updateError;
        }

        console.log('Photo deleted successfully');

        res.status(200).json({ 
            message: 'Profile photo deleted successfully' 
        });

    } catch (error) {
        console.error('Delete photo error:', error);
        res.status(500).json({ 
            message: error.message,
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};

module.exports = {
    uploadProfilePhoto,
    deleteProfilePhoto
};