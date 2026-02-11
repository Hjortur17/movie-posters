import { createClient } from "@supabase/supabase-js";
import type { Movie } from "./tmdb";
import { getDailyGameId } from "./game";

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
export async function getDailyMovieFromDB(
  date: Date
): Promise<Movie | null> {
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

/**
 * Store daily movie in database
 * @param gameId - The game ID (date string in YYYY-MM-DD format)
 * @param movie - The movie data to store
 * @returns true if successful, false otherwise
 */
export async function storeDailyMovieInDB(
  gameId: string,
  movie: Movie
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn("Supabase not configured, cannot store in database");
    return false;
  }

  try {
    const { error } = await supabase
      .from("daily_movies")
      .upsert(
        {
          game_id: gameId,
          movie_data: movie,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "game_id",
        }
      );

    if (error) {
      console.error("Error storing daily movie in database:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error storing daily movie in database:", error);
    return false;
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
      .from("daily_movie_history")
      .select("movie_id")
      .gte("game_id", cutoffDate);

    if (error) {
      console.error("Error fetching recently used movie IDs:", error);
      return new Set();
    }

    return new Set((data ?? []).map((row) => row.movie_id));
  } catch (error) {
    console.error("Error fetching recently used movie IDs:", error);
    return new Set();
  }
}

/**
 * Record that a movie was used as the daily movie for the given date.
 * Call only from the cron after successfully storing in daily_movies.
 */
export async function addToDailyMovieHistory(
  gameId: string,
  movieId: number
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn("Supabase not configured, cannot add to daily movie history");
    return false;
  }

  try {
    const { error } = await supabase.from("daily_movie_history").upsert(
      {
        game_id: gameId,
        movie_id: movieId,
        created_at: new Date().toISOString(),
      },
      { onConflict: "game_id" }
    );

    if (error) {
      console.error("Error adding to daily movie history:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error adding to daily movie history:", error);
    return false;
  }
}
