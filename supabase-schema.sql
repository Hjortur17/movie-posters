-- CoverQuest Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to create the scores table

-- Create the scores table
CREATE TABLE IF NOT EXISTS scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id TEXT NOT NULL,
  anonymous_id TEXT NOT NULL,
  movie_id INTEGER NOT NULL,
  guesses TEXT[] NOT NULL DEFAULT '{}',
  guess_number INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_scores_game_id ON scores(game_id);
CREATE INDEX IF NOT EXISTS idx_scores_anonymous_id ON scores(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_scores_created_at ON scores(created_at DESC);

-- Create a composite index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_scores_game_score ON scores(game_id, score DESC, guess_number ASC);

-- Enable Row Level Security (RLS)
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anyone to insert scores (for anonymous users)
CREATE POLICY "Allow anonymous score insertion"
  ON scores
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create a policy that allows anyone to read scores (for leaderboards)
CREATE POLICY "Allow public score reading"
  ON scores
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Optional: Create a function to get leaderboard for a specific game
CREATE OR REPLACE FUNCTION get_game_leaderboard(p_game_id TEXT, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  game_id TEXT,
  anonymous_id TEXT,
  movie_id INTEGER,
  guesses TEXT[],
  guess_number INTEGER,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.*
  FROM scores s
  WHERE s.game_id = p_game_id
  ORDER BY s.score DESC, s.guess_number ASC, s.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


