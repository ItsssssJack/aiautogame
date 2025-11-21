-- Flappy Bird Leaderboard Table
-- Stores high scores for Flappy Bird mode

CREATE TABLE IF NOT EXISTS flappy_bird_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Player info
  name TEXT NOT NULL,
  character_used TEXT,

  -- Score
  score INTEGER NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint
  CONSTRAINT valid_score CHECK (score >= 0)
);

-- Index for leaderboard queries (sorted by score descending)
CREATE INDEX IF NOT EXISTS idx_flappy_bird_leaderboard_score
  ON flappy_bird_leaderboard(score DESC);

-- Index for recent submissions
CREATE INDEX IF NOT EXISTS idx_flappy_bird_leaderboard_created
  ON flappy_bird_leaderboard(created_at DESC);

-- Enable Row Level Security
ALTER TABLE flappy_bird_leaderboard ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Flappy bird leaderboard is publicly readable"
  ON flappy_bird_leaderboard FOR SELECT
  USING (true);

-- Public insert policy (anyone can submit scores)
CREATE POLICY "Anyone can submit flappy bird scores"
  ON flappy_bird_leaderboard FOR INSERT
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE flappy_bird_leaderboard IS 'Stores high scores for Flappy Bird mode';
