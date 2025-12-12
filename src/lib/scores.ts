import { supabase } from "./supabase";
import type { GameState } from "./game";

export interface Score {
  id: string;
  game_id: string;
  anonymous_id: string;
  movie_id: number;
  guesses: string[];
  guess_number: number;
  score: number;
  created_at: string;
}

export async function submitScore(
  gameState: GameState,
  anonymousId: string,
): Promise<void> {
  const guessNumber = gameState.won ? gameState.currentGuess : 0;

  // Convert guess objects to strings for database storage
  const guessStrings = gameState.guesses.map((guess) => guess.title);

  const { error } = await supabase.from("scores").insert({
    game_id: gameState.gameId,
    anonymous_id: anonymousId,
    movie_id: gameState.movieId,
    guesses: guessStrings,
    guess_number: guessNumber,
    score: gameState.score,
  });

  if (error) {
    console.error("Error submitting score:", error);
    throw error;
  }
}

export async function getUserScores(anonymousId: string): Promise<Score[]> {
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("anonymous_id", anonymousId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user scores:", error);
    throw error;
  }

  return data || [];
}

export async function getLeaderboard(
  gameId: string,
  limit = 10,
): Promise<Score[]> {
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("guess_number", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Error fetching leaderboard:", error);
    throw error;
  }

  return data || [];
}
