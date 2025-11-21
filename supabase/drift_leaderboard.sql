-- Drift Attack Leaderboard Table
-- Stores time attack records, lap times, and ghost data for each track

CREATE TABLE IF NOT EXISTS drift_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Player info
  name TEXT NOT NULL,
  character_used TEXT,

  -- Track info
  track_id TEXT NOT NULL,

  -- Time data
  total_time DECIMAL(10, 3) NOT NULL, -- Total race time in seconds
  lap_times JSONB, -- Array of lap times: [{lap: 1, time: 42.5, isPerfect: true}, ...]
  perfect_laps INTEGER DEFAULT 0,

  -- Ghost data for replay
  ghost_data JSONB, -- Array of position frames: [{x: 100, y: 200, angle: 1.5, timestamp: 0.016}, ...]

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes for performance
  CONSTRAINT valid_total_time CHECK (total_time > 0)
);

-- Index for leaderboard queries (per track, sorted by time)
CREATE INDEX IF NOT EXISTS idx_drift_leaderboard_track_time
  ON drift_leaderboard(track_id, total_time ASC);

-- Index for recent submissions
CREATE INDEX IF NOT EXISTS idx_drift_leaderboard_created
  ON drift_leaderboard(created_at DESC);

-- Enable Row Level Security
ALTER TABLE drift_leaderboard ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Drift leaderboard is publicly readable"
  ON drift_leaderboard FOR SELECT
  USING (true);

-- Public insert policy (anyone can submit times)
CREATE POLICY "Anyone can submit drift times"
  ON drift_leaderboard FOR INSERT
  WITH CHECK (true);

-- Optional: Add a comment for documentation
COMMENT ON TABLE drift_leaderboard IS 'Stores time attack records for Drift Attack mode, including lap times and ghost replay data';
COMMENT ON COLUMN drift_leaderboard.ghost_data IS 'JSON array of position frames for ghost replay: [{x, y, angle, timestamp}, ...]';
COMMENT ON COLUMN drift_leaderboard.lap_times IS 'JSON array of lap time records: [{lap, time, isPerfect}, ...]';
