import { NextRequest, NextResponse } from "next/server";
import {
  redis,
  getGameStateKey,
  getPosterUrlKey,
  getMovieKey,
} from "@/lib/redis";
import { getDailyGameId } from "@/lib/game";
import { getPosterUrl } from "@/lib/tmdb";
import { createInitialGameState, type GameState } from "@/lib/game";
import type { Movie } from "@/lib/tmdb";

const TMDB_API_BASE = "https://api.themoviedb.org/3";

// Fetch daily movie server-side
async function fetchDailyMovie(date: Date): Promise<Movie> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB API key not configured");
  }

  const dateString = date.toISOString().split("T")[0];
  const [year, month, day] = dateString.split("-").map(Number);
  let seed = year * 10000 + month * 100 + day;

  // In development, add timestamp for randomness
  if (process.env.NODE_ENV === "development") {
    const timestamp = Date.now();
    seed = seed + (timestamp % 1000000);
  }

  const allMovies: any[] = [];
  const currentYear = new Date().getFullYear();
  const minReleaseYear = currentYear - 50;

  // Fetch first 3 pages of blockbuster movies
  for (let page = 1; page <= 3; page++) {
    try {
      const url = new URL(`${TMDB_API_BASE}/discover/movie`);
      url.searchParams.set("sort_by", "popularity.desc");
      url.searchParams.set("vote_count.gte", "600");
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
          throw new Error(`TMDB API error: ${response.status}`);
        }
        break;
      }

      const data = await response.json();
      allMovies.push(...data.results);
    } catch (error) {
      if (page === 1) {
        throw error;
      }
      break;
    }
  }

  const moviesWithPosters = allMovies.filter((movie) => movie.poster_path);
  if (moviesWithPosters.length === 0) {
    throw new Error("No movies with posters found");
  }

  // Seeded random selection
  function seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  const randomIndex = Math.floor(seededRandom(seed) * moviesWithPosters.length);
  const selectedMovie = moviesWithPosters[randomIndex];

  // Get full movie details
  const movieUrl = `${TMDB_API_BASE}/movie/${selectedMovie.id}`;
  const movieResponse = await fetch(movieUrl, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!movieResponse.ok) {
    throw new Error(`TMDB API error: ${movieResponse.status}`);
  }

  const movie: Movie = await movieResponse.json();

  // Get credits for director
  try {
    const creditsUrl = `${TMDB_API_BASE}/movie/${selectedMovie.id}/credits`;
    const creditsResponse = await fetch(creditsUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (creditsResponse.ok) {
      const credits = await creditsResponse.json();
      const director = credits.crew?.find(
        (person: any) => person.job === "Director"
      );
      if (director) {
        movie.director_id = director.id;
      }
    }
  } catch (error) {
    // Credits are optional
    console.error("Error fetching credits:", error);
  }

  return movie;
}

// Client-safe game state (without movie details)
export interface ClientGameState {
  gameId: string;
  guesses: Array<{
    title: string;
    year?: number;
    collectionId?: number | null;
    movieId?: number;
    directorId?: number | null;
    genreIds?: number[];
    productionCompanyIds?: number[];
  }>;
  currentGuess: number;
  isComplete: boolean;
  won: boolean;
  score: number;
  posterUrl: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const anonymousId = searchParams.get("anonymousId");
    const gameId = searchParams.get("gameId");

    if (!anonymousId || !gameId) {
      return NextResponse.json(
        { error: "Missing anonymousId or gameId" },
        { status: 400 }
      );
    }

    // Verify gameId matches today's game
    const today = new Date();
    const todayGameId = getDailyGameId(today);
    if (gameId !== todayGameId) {
      return NextResponse.json({ error: "Invalid gameId" }, { status: 400 });
    }

    const gameStateKey = getGameStateKey(anonymousId, gameId);
    const posterUrlKey = getPosterUrlKey(gameId);

    // Try to get existing game state
    const existingState = await redis.get<GameState>(gameStateKey);
    const posterUrl = await redis.get<string | null>(posterUrlKey);

    if (existingState && posterUrl !== null) {
      // Return client-safe state
      const clientState: ClientGameState = {
        gameId: existingState.gameId,
        guesses: existingState.guesses,
        currentGuess: existingState.currentGuess,
        isComplete: existingState.isComplete,
        won: existingState.won,
        score: existingState.score,
        posterUrl,
      };
      return NextResponse.json(clientState);
    }

    // Initialize new game
    const fullMovieDetails = await fetchDailyMovie(today);
    const state = createInitialGameState(gameId, fullMovieDetails);
    const moviePosterUrl = getPosterUrl(fullMovieDetails.poster_path);

    // Store full game state and movie data in Redis
    await Promise.all([
      redis.setex(gameStateKey, 86400 * 2, state), // Expire in 2 days
      redis.setex(getMovieKey(gameId), 86400 * 2, fullMovieDetails),
      redis.setex(posterUrlKey, 86400 * 2, moviePosterUrl),
    ]);

    // Return client-safe state
    const clientState: ClientGameState = {
      gameId: state.gameId,
      guesses: state.guesses,
      currentGuess: state.currentGuess,
      isComplete: state.isComplete,
      won: state.won,
      score: state.score,
      posterUrl: moviePosterUrl,
    };

    return NextResponse.json(clientState);
  } catch (error) {
    console.error("Error getting game state:", error);
    return NextResponse.json(
      { error: "Failed to get game state" },
      { status: 500 }
    );
  }
}
