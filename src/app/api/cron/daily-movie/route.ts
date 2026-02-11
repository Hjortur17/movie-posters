import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getDailyGameId } from "@/lib/game";
import {
  addToDailyMovieHistory,
  getRecentlyUsedMovieIds,
  storeDailyMovieInDB,
} from "@/lib/daily-movies";
import type { Movie } from "@/lib/tmdb";

const TMDB_API_BASE = "https://api.themoviedb.org/3";

// Simple seeded random number generator (same as in daily route)
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Fetch daily movie using the same logic as the daily route
async function fetchDailyMovie(dateString: string): Promise<Movie | null> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.error("TMDB API key not configured");
    return null;
  }

  try {
    const recentIds = await getRecentlyUsedMovieIds();

    // Create a seed from the date (YYYY-MM-DD format)
    const [year, month, day] = dateString.split("-").map(Number);
    const seed = year * 10000 + month * 100 + day;

    const allMovies: Array<{
      id: number;
      poster_path: string | null;
      [key: string]: unknown;
    }> = [];

    // Fetch blockbuster movies using discover endpoint with filters
    const currentYear = new Date().getFullYear();
    const minReleaseYear = currentYear - 70;

    // Fetch first 3 pages of blockbuster movies for better variety
    for (let page = 1; page <= 3; page++) {
      try {
        const url = new URL(`${TMDB_API_BASE}/discover/movie`);
        url.searchParams.set("sort_by", "popularity.desc");
        url.searchParams.set("vote_count.gte", "450");
        url.searchParams.set("vote_average.gte", "4.5");
        url.searchParams.set(
          "primary_release_date.gte",
          `${minReleaseYear}-01-01`
        );
        url.searchParams.set("page", page.toString());

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          if (page === 1) {
            console.error("TMDB API error:", response.status);
            return null;
          }
          break;
        }

        const data = await response.json();
        allMovies.push(...data.results);
      } catch (error) {
        if (page === 1) {
          console.error("Error fetching blockbuster movies:", error);
          return null;
        }
        break;
      }
    }

    // Filter movies with posters
    const moviesWithPosters = allMovies.filter((movie) => movie.poster_path);

    if (moviesWithPosters.length === 0) {
      console.error("No movies with posters found");
      return null;
    }

    // Exclude movies used in the last 200 days; fall back to full list if none left (Option A)
    let candidates = moviesWithPosters.filter((m) => !recentIds.has(m.id));
    if (candidates.length === 0) {
      console.warn(
        "[Cron] All candidates were recently used; falling back to full list for 200-day exclusion"
      );
      candidates = moviesWithPosters;
    }

    // Use seeded random to pick a movie (deterministic based on date)
    const randomIndex = Math.floor(seededRandom(seed) * candidates.length);
    const selectedMovie = candidates[randomIndex];

    // Get full movie details
    const movieUrl = `${TMDB_API_BASE}/movie/${selectedMovie.id}`;
    const movieResponse = await fetch(movieUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!movieResponse.ok) {
      console.error("TMDB API error:", movieResponse.status);
      return null;
    }

    const movie: Movie = await movieResponse.json();

    // Fetch credits to get director_id
    try {
      const creditsUrl = `${TMDB_API_BASE}/movie/${selectedMovie.id}/credits`;
      const creditsResponse = await fetch(creditsUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (creditsResponse.ok) {
        const credits = (await creditsResponse.json()) as {
          crew?: Array<{ job: string; id: number }>;
        };
        const director = credits.crew?.find(
          (person) => person.job === "Director"
        );
        movie.director_id = director?.id || undefined;
      }
    } catch (error) {
      console.warn("Error fetching credits (non-fatal):", error);
      // Continue without director_id
    }

    return movie;
  } catch (error) {
    console.error("Error fetching daily movie:", error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  // Validate cron secret for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    // In development, allow without secret, but log a warning
    if (process.env.NODE_ENV === "production") {
      console.warn("CRON_SECRET not set in production!");
    }
  }

  try {
    // Get today's date in UTC (Icelandic time is UTC+0)
    const today = new Date();
    const dateString = today.toISOString().split("T")[0];
    const gameId = getDailyGameId(today);

    console.log(`[Cron] Fetching daily movie for ${dateString} (game_id: ${gameId})`);

    // Fetch the daily movie
    const movie = await fetchDailyMovie(dateString);

    if (!movie) {
      return NextResponse.json(
        { error: "Failed to fetch daily movie" },
        { status: 500 }
      );
    }

    // Store in database
    const stored = await storeDailyMovieInDB(gameId, movie);

    if (!stored) {
      console.error("Failed to store daily movie in database");
      return NextResponse.json(
        { error: "Failed to store daily movie in database" },
        { status: 500 }
      );
    }

    const historyStored = await addToDailyMovieHistory(gameId, movie.id);
    if (!historyStored) {
      console.error("Failed to store daily movie in history table");
      return NextResponse.json(
        { error: "Failed to store daily movie in history table" },
        { status: 500 }
      );
    }

    console.log(
      `[Cron] Successfully stored daily movie: ${movie.title} (ID: ${movie.id}) for ${dateString}`
    );

    return NextResponse.json({
      success: true,
      gameId,
      movie: {
        id: movie.id,
        title: movie.title,
      },
    });
  } catch (error) {
    console.error("Error in cron job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
