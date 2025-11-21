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
  const { data, error } = await supabase
    .from('elimination_leaderboard')
    .insert([entry])
    .select();

  if (error) {
    console.error('Error saving elimination score:', error);
    throw error;
  }

  return data;
}
