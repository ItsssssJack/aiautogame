import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xsivngacfkupbjwtbuvo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaXZuZ2FjZmt1cGJqd3RidXZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1NzQxMzMsImV4cCI6MjA3NTE1MDEzM30.tDW8NlILfc09UMP0YxHyf1qqESqZyaoX17uGduLW8g8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Racing leaderboard functions
export async function fetchRacingLeaderboard() {
  const { data, error } = await supabase
    .from('racing_leaderboard')
    .select('*')
    .order('score', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching racing leaderboard:', error);
    return [];
  }

  return data || [];
}

export async function saveRacingScore(entry: {
  name: string;
  score: number;
  rank_title?: string;
  ai_comment?: string;
}) {
  const { data, error } = await supabase
    .from('racing_leaderboard')
    .insert([entry])
    .select();

  if (error) {
    console.error('Error saving racing score:', error);
    throw error;
  }

  return data;
}

// Elimination leaderboard functions
export async function fetchEliminationLeaderboard() {
  const { data, error } = await supabase
    .from('elimination_leaderboard')
    .select('*')
    .order('score', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching elimination leaderboard:', error);
    return [];
  }

  return data || [];
}

export async function saveEliminationScore(entry: {
  name: string;
  score: number;
  placement: number;
  total_fighters: number;
  fighter_used: string;
}) {
  const { data, error} = await supabase
    .from('elimination_leaderboard')
    .insert([entry])
    .select();

  if (error) {
    console.error('Error saving elimination score:', error);
    throw error;
  }

  return data;
}

// Community avatar functions
export async function fetchCommunityAvatars() {
  // Limit to most recent 100 community avatars to prevent performance issues
  // with large numbers of uploads. Can adjust this limit as needed.
  const { data, error } = await supabase
    .from('community_avatars')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching community avatars:', error);
    return [];
  }

  return data || [];
}

export async function uploadCommunityAvatar(file: File, name: string, color: string, accentColor: string) {
  try {
    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File size must be less than 5MB');
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      throw new Error('File must be JPG, PNG, or WebP');
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const storagePath = `avatars/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(storagePath);

    // Save record to database
    const { data: avatarData, error: dbError } = await supabase
      .from('community_avatars')
      .insert([{
        name,
        avatar_url: publicUrl,
        storage_path: storagePath,
        color,
        accent_color: accentColor
      }])
      .select()
      .single();

    if (dbError) {
      console.error('Error saving avatar record:', dbError);
      // Try to clean up uploaded file
      await supabase.storage.from('avatars').remove([storagePath]);
      throw dbError;
    }

    return avatarData;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

// Drift Attack leaderboard functions
export async function fetchDriftLeaderboard(trackId: string) {
  const { data, error } = await supabase
    .from('drift_leaderboard')
    .select('*')
    .eq('track_id', trackId)
    .order('total_time', { ascending: true })
    .limit(100);

  if (error) {
    console.error('Error fetching drift leaderboard:', error);
    return [];
  }

  return data || [];
}

export async function saveDriftTime(entry: {
  name: string;
  character_used?: string;
  track_id: string;
  total_time: number;
  lap_times: any[];
  perfect_laps: number;
  ghost_data: any[];
}) {
  const { data, error } = await supabase
    .from('drift_leaderboard')
    .insert([entry])
    .select();

  if (error) {
    console.error('Error saving drift time:', error);
    throw error;
  }

  return data;
}

export async function fetchGlobalBestGhost(trackId: string) {
  const { data, error } = await supabase
    .from('drift_leaderboard')
    .select('ghost_data, total_time, name')
    .eq('track_id', trackId)
    .order('total_time', { ascending: true })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching global best ghost:', error);
    return null;
  }

  return data;
}

// Flappy Bird leaderboard functions
export async function fetchFlappyBirdLeaderboard() {
  const { data, error } = await supabase
    .from('flappy_bird_leaderboard')
    .select('*')
    .order('score', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching flappy bird leaderboard:', error);
    return [];
  }

  return data || [];
}

export async function saveFlappyBirdScore(entry: {
  name: string;
  score: number;
  character_used?: string;
}) {
  const { data, error } = await supabase
    .from('flappy_bird_leaderboard')
    .insert([entry])
    .select();

  if (error) {
    console.error('Error saving flappy bird score:', error);
    throw error;
  }

  return data;
}
