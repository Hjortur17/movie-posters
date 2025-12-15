"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getDailyGameId,
  getPixelationLevel,
  createInitialGameState,
  updateGameState,
  type GameState,
} from "@/lib/game";
import { getAnonymousId } from "@/lib/user";
import { getDailyMovie, getPosterUrl, getMovieDetails } from "@/lib/tmdb";
import { submitScore } from "@/lib/scores";
import { MovieSearch } from "./MovieSearch";
import { MoviePoster } from "./MoviePoster";
import { GuessHistory } from "./GuessHistory";
import { ScoreDisplay } from "./ScoreDisplay";
import type { MovieSearchResult } from "@/lib/tmdb";
import type { Movie } from "@/lib/tmdb";

const GAME_STATE_KEY = "coverquest_game_state";
const CURRENT_MOVIE_KEY = "coverquest_current_movie";
const POSTER_URL_KEY = "coverquest_poster_url";

export const GameBoard = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentMovie, setCurrentMovie] = useState<Movie | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load or initialize game
  useEffect(() => {
    const initializeGame = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const today = new Date();
        const gameId = getDailyGameId(today);

        // Check if we have saved game state for today
        const savedState = localStorage.getItem(GAME_STATE_KEY);
        const savedMovie = localStorage.getItem(CURRENT_MOVIE_KEY);
        const savedPosterUrl = localStorage.getItem(POSTER_URL_KEY);

        let state: GameState | null = null;
        let movie: Movie | null = null;
        let url: string | null = null;

        if (savedState && savedMovie && savedPosterUrl) {
          try {
            const parsedState = JSON.parse(savedState) as GameState;
            const parsedMovie = JSON.parse(savedMovie) as Movie;
            url = savedPosterUrl;

            // Verify it's for today's game
            if (parsedState.gameId === gameId) {
              state = parsedState;
              movie = parsedMovie;
              // Ensure we have full movie details with relationship data
              try {
                const fullDetails = await getMovieDetails(movie.id);
                movie = { ...movie, ...fullDetails };
                localStorage.setItem(CURRENT_MOVIE_KEY, JSON.stringify(movie));
              } catch (error) {
                console.error("Error fetching full movie details:", error);
              }
            }
          } catch (e) {
            console.error("Error parsing saved game state:", e);
          }
        }

        // If no valid saved state, fetch new movie
        const isDevelopment =
          typeof window !== "undefined" &&
          (window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1");

        if (!state || !movie || !url || isDevelopment) {
          // In development, always fetch a new movie each time
          movie = await getDailyMovie(today, isDevelopment);
          // Ensure we have full movie details with relationship data
          try {
            const fullDetails = await getMovieDetails(movie.id);
            movie = { ...movie, ...fullDetails };
          } catch (error) {
            console.error("Error fetching full movie details:", error);
          }
          state = createInitialGameState(gameId, movie);
          url = getPosterUrl(movie.poster_path);

          // Save to localStorage
          localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
          localStorage.setItem(CURRENT_MOVIE_KEY, JSON.stringify(movie));
          localStorage.setItem(POSTER_URL_KEY, url || "");
        }

        setGameState(state);
        setCurrentMovie(movie);
        setPosterUrl(url);

        // Preload the poster image
        if (url) {
          const img = new Image();
          img.src = url;
          const link = document.createElement("link");
          link.rel = "preload";
          link.as = "image";
          link.href = url;
          document.head.appendChild(link);
        }
      } catch (err) {
        console.error("Error initializing game:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load game. Please try again.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    initializeGame();
  }, []);

  const handleMovieSelect = useCallback(
    async (selectedMovie: MovieSearchResult) => {
      if (!gameState || !currentMovie || gameState.isComplete) {
        return;
      }

      // Fetch full movie details to get relationship info
      let guessCollectionId: number | null = null;
      let guessYear: number | undefined = undefined;
      let guessDirectorId: number | null = null;
      let guessGenreIds: number[] = [];
      let guessProductionCompanyIds: number[] = [];

      try {
        const fullMovieDetails = await getMovieDetails(selectedMovie.id);
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

      // Use movie ID comparison for accurate matching
      const isCorrect = selectedMovie.id === currentMovie.id;
      const guess = {
        title: selectedMovie.title,
        year: guessYear,
        collectionId: guessCollectionId,
        movieId: selectedMovie.id,
        directorId: guessDirectorId,
        genreIds: guessGenreIds,
        productionCompanyIds: guessProductionCompanyIds,
      };
      const newState = updateGameState(gameState, guess, isCorrect);

      setGameState(newState);

      // Save updated state
      localStorage.setItem(GAME_STATE_KEY, JSON.stringify(newState));

      // Submit score if game is complete
      if (newState.isComplete) {
        try {
          const anonymousId = getAnonymousId();
          await submitScore(newState, anonymousId);
        } catch (err) {
          console.error("Error submitting score:", err);
        }
      }
    },
    [gameState, currentMovie],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-lg mb-2">Loading today's movie...</div>
          <div className="text-sm text-gray-500">Please wait</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">Error</div>
          <div className="text-sm text-gray-600">{error}</div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!gameState || !currentMovie) {
    return null;
  }

  // Show unfiltered image (0% pixelation) when game is complete, otherwise use progressive pixelation
  const pixelationLevel = gameState.isComplete
    ? 0
    : getPixelationLevel(gameState.currentGuess);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-6">
        <MoviePoster imageUrl={posterUrl} pixelationLevel={pixelationLevel} />
      </div>

      {!gameState.isComplete && (
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">
            Guess {gameState.currentGuess + 1} of 5
          </p>
          <MovieSearch
            onSelect={handleMovieSelect}
            disabled={gameState.isComplete}
          />
        </div>
      )}

      {gameState.guesses.length > 0 && (
        <GuessHistory
          gameState={gameState}
          correctMovie={gameState.isComplete ? currentMovie : undefined}
        />
      )}

      {gameState.isComplete && (
        <ScoreDisplay gameState={gameState} correctMovie={currentMovie} />
      )}

      {gameState.isComplete && !gameState.won && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <p className="font-semibold mb-2">The correct answer was:</p>
          <p className="text-xl">{currentMovie.title}</p>
          {currentMovie.release_date && (
            <p className="text-sm text-gray-600 mt-1">
              ({new Date(currentMovie.release_date).getFullYear()})
            </p>
          )}
        </div>
      )}
    </div>
  );
};
