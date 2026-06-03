import { createClient } from "@supabase/supabase-js";
import { getDailyGameId } from "./game";
import type { Movie } from "./tmdb";

// Get Supabase client with anon/publishable key
function getSupabaseClient() {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Fetch daily movie from database
 * @param date - The date to fetch the movie for
 * @returns The movie data if found, null otherwise
 */
export async function getDailyMovieFromDB(date: Date): Promise<Movie | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn("Supabase not configured, cannot fetch from database");
    return null;
  }

  const gameId = getDailyGameId(date);

  try {
    const { data, error } = await supabase
      .from("daily_movies")
      .select("movie_data")
      .eq("game_id", gameId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No rows returned
        return null;
      }
      console.error("Error fetching daily movie from database:", error);
      return null;
    }

    return data?.movie_data as Movie | null;
  } catch (error) {
    console.error("Error fetching daily movie from database:", error);
    return null;
  }
}

export type StoreDailyMovieResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Store daily movie in database
 * @param gameId - The game ID (date string in YYYY-MM-DD format)
 * @param movie - The movie data to store
 * @returns Result with success flag and error message when failed
 */
export async function storeDailyMovieInDB(
  gameId: string,
  movie: Movie,
): Promise<StoreDailyMovieResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    const msg =
      "Supabase not configured (missing SUPABASE_URL or Supabase anon key)";
    console.warn(msg);
    return { success: false, error: msg };
  }

  try {
    const { error } = await supabase.from("daily_movies").upsert(
      {
        game_id: gameId,
        movie_data: movie,
        movie_id: movie.id,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "game_id",
      },
    );

    if (error) {
      const msg = `${error.message} (code: ${error.code ?? "unknown"})`;
      console.error("Error storing daily movie in database:", error);
      return { success: false, error: msg };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error storing daily movie in database:", err);
    return { success: false, error: msg };
  }
}

const RECENT_DAYS = 200;

/**
 * Get TMDB movie IDs that have been used as the daily movie in the last 200 days.
 * Used to exclude them when picking the next daily movie.
 */
export async function getRecentlyUsedMovieIds(): Promise<Set<number>> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return new Set();
  }

  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() - RECENT_DAYS);
  const cutoffYear = cutoff.getUTCFullYear();
  const cutoffMonth = String(cutoff.getUTCMonth() + 1).padStart(2, "0");
  const cutoffDay = String(cutoff.getUTCDate()).padStart(2, "0");
  const cutoffDate = `${cutoffYear}-${cutoffMonth}-${cutoffDay}`;

  try {
    const { data, error } = await supabase
      .from("daily_movies")
      .select("movie_id")
      .gte("game_id", cutoffDate);

    if (error) {
      console.error("Error fetching recently used movie IDs:", error);
      return new Set();
    }

    return new Set(
      (data ?? [])
        .filter((row): row is { movie_id: number } => row.movie_id != null)
        .map((row) => row.movie_id),
    );
  } catch (error) {
    console.error("Error fetching recently used movie IDs:", error);
    return new Set();
  }
}

/**
 * Ensure movie_id is recorded for this date in daily_movies (used by cron after store).
 * Updates the existing row so "recently used" lookups can use movie_id.
 */
export async function addToDailyMovieHistory(
  gameId: string,
  movieId: number,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn("Supabase not configured, cannot add to daily movie history");
    return false;
  }

  try {
    const { error } = await supabase
      .from("daily_movies")
      .update({ movie_id: movieId, updated_at: new Date().toISOString() })
      .eq("game_id", gameId);

    if (error) {
      console.error(
        "Error updating daily movie history:",
        error.message,
        error.code,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating daily movie history:", error);
    return false;
  }
}
