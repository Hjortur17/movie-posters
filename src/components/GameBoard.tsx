"use client";

import { useState, useEffect, useCallback } from "react";
import { getDailyGameId, getPixelationLevel, type GameState } from "@/lib/game";
import { getAnonymousId } from "@/lib/user";
import { MovieSearch } from "./MovieSearch";
import { MoviePoster } from "./MoviePoster";
import { GuessHistory } from "./GuessHistory";
import { ScoreDisplay } from "./ScoreDisplay";
import type { MovieSearchResult } from "@/lib/tmdb";
import type { Movie } from "@/lib/tmdb";

// Client-safe game state from API
interface ClientGameState {
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

export const GameBoard = () => {
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [currentMovie, setCurrentMovie] = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load game state from server
  useEffect(() => {
    const initializeGame = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const today = new Date();
        const gameId = getDailyGameId(today);
        const anonymousId = getAnonymousId();

        // Fetch game state from server
        const response = await fetch(
          `/api/game/state?anonymousId=${encodeURIComponent(anonymousId)}&gameId=${encodeURIComponent(gameId)}`,
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `Failed to load game: ${response.status}`,
          );
        }

        const state: ClientGameState = await response.json();
        setGameState(state);

        // Preload the poster image so it's ready immediately
        if (state.posterUrl) {
          // Preload using Image object (browser will cache it)
          const img = new Image();
          img.src = state.posterUrl;

          // Also add link preload for better browser optimization
          const existingLink = document.querySelector(
            `link[href="${state.posterUrl}"]`,
          );
          if (!existingLink) {
            const link = document.createElement("link");
            link.rel = "preload";
            link.as = "image";
            link.href = state.posterUrl;
            document.head.appendChild(link);
          }
        }

        // Only fetch movie details if game is complete
        if (state.isComplete) {
          try {
            const movieResponse = await fetch(
              `/api/game/movie?gameId=${encodeURIComponent(gameId)}&isComplete=true`,
            );
            if (movieResponse.ok) {
              const movie: Movie = await movieResponse.json();
              setCurrentMovie(movie);
            }
          } catch (err) {
            console.error("Error fetching movie details:", err);
          }
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
      if (!gameState || gameState.isComplete) {
        return;
      }

      try {
        const today = new Date();
        const gameId = getDailyGameId(today);
        const anonymousId = getAnonymousId();

        // Submit guess to server
        const response = await fetch("/api/game/guess", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            anonymousId,
            gameId,
            guess: {
              title: selectedMovie.title,
              movieId: selectedMovie.id,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to submit guess");
        }

        const updatedState: ClientGameState = await response.json();
        setGameState(updatedState);

        // Ensure poster is preloaded after state update
        if (updatedState.posterUrl) {
          const img = new Image();
          img.src = updatedState.posterUrl;
        }

        // Fetch movie details if game is now complete
        if (updatedState.isComplete) {
          try {
            const movieResponse = await fetch(
              `/api/game/movie?gameId=${encodeURIComponent(gameId)}&isComplete=true`,
            );
            if (movieResponse.ok) {
              const movie: Movie = await movieResponse.json();
              setCurrentMovie(movie);
            }
          } catch (err) {
            console.error("Error fetching movie details:", err);
          }
        }
      } catch (err) {
        console.error("Error submitting guess:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to submit guess. Please try again.",
        );
      }
    },
    [gameState],
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
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return null;
  }

  // Show unfiltered image (0% pixelation) when game is complete, otherwise use progressive pixelation
  const pixelationLevel = gameState.isComplete
    ? 0
    : getPixelationLevel(gameState.currentGuess);

  // Convert client state to GameState for components that need it
  const gameStateForComponents: GameState = {
    gameId: gameState.gameId,
    movieId: 0, // Not exposed to client
    movieTitle: "", // Not exposed to client
    guesses: gameState.guesses,
    currentGuess: gameState.currentGuess,
    isComplete: gameState.isComplete,
    won: gameState.won,
    score: gameState.score,
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-6">
        <MoviePoster
          imageUrl={gameState.posterUrl}
          pixelationLevel={pixelationLevel}
        />
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

      {gameState.guesses.length > 0 && currentMovie && (
        <GuessHistory
          gameState={gameStateForComponents}
          correctMovie={currentMovie}
        />
      )}

      {currentMovie && (
        <ScoreDisplay
          gameState={gameStateForComponents}
          correctMovie={currentMovie}
        />
      )}

      {gameState.isComplete && !gameState.won && currentMovie && (
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
