import { NextRequest, NextResponse } from "next/server";
import {
  redis,
  getGameStateKey,
  getMovieKey,
  getPosterUrlKey,
} from "@/lib/redis";
import { getDailyGameId } from "@/lib/game";
import { updateGameState, type GameState, type Guess } from "@/lib/game";
import type { Movie } from "@/lib/tmdb";
import { submitScore } from "@/lib/scores";

const TMDB_API_BASE = "https://api.themoviedb.org/3";

// Fetch movie details server-side
async function fetchMovieDetails(movieId: number): Promise<Movie> {
  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!apiKey) {
    throw new Error("TMDB API key not configured");
  }

  const [movieResponse, creditsResponse] = await Promise.all([
    fetch(`${TMDB_API_BASE}/movie/${movieId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }),
    fetch(`${TMDB_API_BASE}/movie/${movieId}/credits`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }).catch(() => null),
  ]);

  if (!movieResponse.ok) {
    throw new Error(`TMDB API error: ${movieResponse.status}`);
  }

  const movie: Movie = await movieResponse.json();

  // Add director ID from credits if available
  if (creditsResponse?.ok) {
    const credits = await creditsResponse.json();
    const director = credits.crew?.find(
      (person: any) => person.job === "Director"
    );
    if (director) {
      movie.director_id = director.id;
    }
  }

  return movie;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { anonymousId, gameId, guess } = body;

    if (!anonymousId || !gameId || !guess) {
      return NextResponse.json(
        { error: "Missing required fields" },
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
    const movieKey = getMovieKey(gameId);
    const posterUrlKey = getPosterUrlKey(gameId);

    // Get current game state, movie, and poster URL
    const [currentState, correctMovie, posterUrl] = await Promise.all([
      redis.get<GameState>(gameStateKey),
      redis.get<Movie>(movieKey),
      redis.get<string | null>(posterUrlKey),
    ]);

    if (!currentState || !correctMovie) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    if (currentState.isComplete) {
      return NextResponse.json(
        { error: "Game already complete" },
        { status: 400 }
      );
    }

    // Fetch full details for the guessed movie
    let guessCollectionId: number | null = null;
    let guessYear: number | undefined = undefined;
    let guessDirectorId: number | null = null;
    let guessGenreIds: number[] = [];
    let guessProductionCompanyIds: number[] = [];

    try {
      const fullMovieDetails = await fetchMovieDetails(guess.movieId);
      guessCollectionId = fullMovieDetails.belongs_to_collection?.id || null;
      guessYear = fullMovieDetails.release_date
        ? new Date(fullMovieDetails.release_date).getFullYear()
        : undefined;
      guessDirectorId = fullMovieDetails.director_id || null;
      guessGenreIds = fullMovieDetails.genres?.map((g) => g.id) || [];
      guessProductionCompanyIds =
        fullMovieDetails.production_companies?.map((c) => c.id) || [];
    } catch (error) {
      console.error("Error fetching movie details:", error);
    }

    // Create guess object
    const guessObj: Guess = {
      title: guess.title,
      year: guessYear,
      collectionId: guessCollectionId,
      movieId: guess.movieId,
      directorId: guessDirectorId,
      genreIds: guessGenreIds,
      productionCompanyIds: guessProductionCompanyIds,
    };

    // Check if guess is correct
    const isCorrect = guess.movieId === correctMovie.id;

    // Update game state
    const newState = updateGameState(currentState, guessObj, isCorrect);

    // Save updated state
    await redis.setex(gameStateKey, 86400 * 2, newState);

    // Submit score if game is complete
    if (newState.isComplete) {
      try {
        await submitScore(newState, anonymousId);
      } catch (err) {
        console.error("Error submitting score:", err);
        // Don't fail the request if score submission fails
      }
    }

    // Return updated state (without movie details, but with posterUrl)
    const responseState = {
      gameId: newState.gameId,
      guesses: newState.guesses,
      currentGuess: newState.currentGuess,
      isComplete: newState.isComplete,
      won: newState.won,
      score: newState.score,
      posterUrl: posterUrl || null,
    };

    return NextResponse.json(responseState);
  } catch (error) {
    console.error("Error processing guess:", error);
    return NextResponse.json(
      { error: "Failed to process guess" },
      { status: 500 }
    );
  }
}
