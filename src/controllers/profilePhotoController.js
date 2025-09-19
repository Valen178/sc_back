const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const uploadProfilePhoto = async (req, res) => {
    try {
        const userId = req.user.id;
        const file = req.file;
        const profileType = req.body.profileType;

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        if (!['athlete', 'agent', 'team'].includes(profileType)) {
            return res.status(400).json({ message: 'Invalid profile type' });
        }

        // Upload to Supabase Storage
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${profileType}_${userId}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase
            .storage
            .from('profile_photos')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase
            .storage
            .from('profile_photos')
            .getPublicUrl(fileName);

        // Update profile with new photo URL
        const { error: updateError } = await supabase
            .from(profileType)
            .update({ photo_url: publicUrl })
            .eq('user_id', userId);

        if (updateError) throw updateError;

        res.status(200).json({
            message: 'Profile photo updated successfully',
            photo_url: publicUrl
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
};

const deleteProfilePhoto = async (req, res) => {
    try {
        const userId = req.user.id;
        const profileType = req.body.profileType;

        // Get current photo URL
        const { data: profile } = await supabase
            .from(profileType)
            .select('photo_url')
            .eq('user_id', userId)
            .single();

        if (profile?.photo_url) {
            const fileName = profile.photo_url.split('/').pop();
            
            const { error: deleteError } = await supabase
                .storage
                .from('profile_photos')
                .remove([fileName]);

            if (deleteError) throw deleteError;
        }

        // Update profile
        const { error: updateError } = await supabase
            .from(profileType)
            .update({ photo_url: null })
            .eq('user_id', userId);

        if (updateError) throw updateError;

        res.status(200).json({ message: 'Profile photo deleted successfully' });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    uploadProfilePhoto,
    deleteProfilePhoto
};