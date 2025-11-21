-- Racing Leaderboard Table
CREATE TABLE IF NOT EXISTS racing_leaderboard (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  rank_title TEXT,
  ai_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster sorting
CREATE INDEX IF NOT EXISTS racing_leaderboard_score_idx ON racing_leaderboard(score DESC);

-- Enable Row Level Security
ALTER TABLE racing_leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read
CREATE POLICY "Anyone can view racing leaderboard"
  ON racing_leaderboard
  FOR SELECT
  USING (true);

-- Allow anyone to insert
CREATE POLICY "Anyone can add racing scores"
  ON racing_leaderboard
  FOR INSERT
  WITH CHECK (true);

-- Elimination Leaderboard Table
CREATE TABLE IF NOT EXISTS elimination_leaderboard (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  placement INTEGER NOT NULL,
  total_fighters INTEGER NOT NULL,
  fighter_used TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster sorting
CREATE INDEX IF NOT EXISTS elimination_leaderboard_score_idx ON elimination_leaderboard(score DESC);

-- Enable Row Level Security
ALTER TABLE elimination_leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read
CREATE POLICY "Anyone can view elimination leaderboard"
  ON elimination_leaderboard
  FOR SELECT
  USING (true);

-- Allow anyone to insert
CREATE POLICY "Anyone can add elimination scores"
  ON elimination_leaderboard
  FOR INSERT
  WITH CHECK (true);
