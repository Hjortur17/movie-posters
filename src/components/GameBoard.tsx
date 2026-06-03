"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createInitialGameState,
  type GameState,
  getDailyGameId,
  getDisplayDate,
  getPixelationLevel,
  getPuzzleNumber,
  skipGuess,
  updateGameState,
} from "@/lib/game";
import { getUserScores, submitScore } from "@/lib/scores";
import { deriveStats } from "@/lib/stats";
import type { Movie, MovieSearchResult } from "@/lib/tmdb";
import { getDailyMovie, getMovieDetails, getPosterUrl } from "@/lib/tmdb";
import { getAnonymousId } from "@/lib/user";
import { GuessList } from "./GuessList";
import { MoviePoster } from "./MoviePoster";
import { MovieSearch } from "./MovieSearch";
import { ScoreDisplay } from "./ScoreDisplay";
import { TopBar } from "./TopBar";
import { UserStats } from "./UserStats";

const GAME_STATE_KEY = "posterquest_game_state";
const CURRENT_MOVIE_KEY = "posterquest_current_movie";
// POSTER_URL_KEY removed - we reconstruct it from movie data to prevent exposing original URL

export const GameBoard = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentMovie, setCurrentMovie] = useState<Movie | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [currentStreak, setCurrentStreak] = useState<number | null>(null);

  const today = new Date();
  const puzzleNumber = getPuzzleNumber(today);
  const dateLabel = getDisplayDate(today);

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

        let state: GameState | null = null;
        let movie: Movie | null = null;

        if (savedState && savedMovie) {
          try {
            const parsedState = JSON.parse(savedState) as GameState;
            const parsedMovie = JSON.parse(savedMovie) as Movie;

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

        // If no valid saved state, or dev features enabled, fetch new movie
        const devFeaturesEnabled =
          process.env.NEXT_PUBLIC_DEV_FEATURES === "true";

        if (!state || !movie || devFeaturesEnabled) {
          // When dev features are on, always fetch a new movie each time
          movie = await getDailyMovie(today, devFeaturesEnabled);
          // Ensure we have full movie details with relationship data
          try {
            const fullDetails = await getMovieDetails(movie.id);
            movie = { ...movie, ...fullDetails };
          } catch (error) {
            console.error("Error fetching full movie details:", error);
          }
          state = createInitialGameState(gameId, movie);

          // Save to localStorage (but NOT the poster URL)
          localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
          localStorage.setItem(CURRENT_MOVIE_KEY, JSON.stringify(movie));
        }

        // Always reconstruct poster URL from movie data (never store it)
        const url = getPosterUrl(movie.poster_path);

        // Clean up old poster URL from localStorage if it exists (security: remove original URL)
        if (typeof window !== "undefined") {
          localStorage.removeItem("posterquest_poster_url");
        }

        setGameState(state);
        setCurrentMovie(movie);
        setPosterUrl(url);

        // DO NOT preload the original image - only pixelated versions should be loaded
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

  // Load streak for the footer line; refresh once a game completes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when the game completes
  useEffect(() => {
    const loadStreak = async () => {
      try {
        const scores = await getUserScores(getAnonymousId());
        setCurrentStreak(deriveStats(scores).currentStreak);
      } catch {
        setCurrentStreak(0);
      }
    };
    loadStreak();
  }, [gameState?.isComplete]);

  const persistAndMaybeSubmit = useCallback(async (newState: GameState) => {
    setGameState(newState);
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(newState));
    if (newState.isComplete) {
      try {
        await submitScore(newState, getAnonymousId());
      } catch (err) {
        console.error("Error submitting score:", err);
      }
    }
  }, []);

  const handleMovieSelect = useCallback(
    async (selectedMovie: MovieSearchResult) => {
      if (!gameState || !currentMovie || gameState.isComplete) {
        return;
      }

      // Fetch full movie details to get relationship info
      let guessCollectionId: number | null = null;
      let guessYear: number | undefined;
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
      await persistAndMaybeSubmit(newState);
    },
    [gameState, currentMovie, persistAndMaybeSubmit],
  );

  const handleSkip = useCallback(async () => {
    if (!gameState || gameState.isComplete) return;
    await persistAndMaybeSubmit(skipGuess(gameState));
  }, [gameState, persistAndMaybeSubmit]);

  return (
    <div className="flex min-h-screen flex-col px-5 pb-8 pt-7 sm:px-10">
      <TopBar
        puzzleNumber={puzzleNumber}
        dateLabel={dateLabel}
        onOpenStats={() => setStatsOpen(true)}
      />

      {error ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mb-2 text-lg text-crimson">
              Couldn&apos;t load today&apos;s poster
            </div>
            <div className="text-sm text-cn-dim">{error}</div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 bg-amber px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-(--cn-bg) hover:bg-amber-hover"
            >
              Retry
            </button>
          </div>
        </div>
      ) : (
        <div className="grid flex-1 items-center gap-14 py-10 lg:grid-cols-[1fr_1.05fr]">
          {/* Poster column */}
          <div className="flex justify-center">
            <MoviePoster
              imageUrl={posterUrl}
              pixelationLevel={
                gameState
                  ? gameState.isComplete
                    ? 0
                    : getPixelationLevel(gameState.currentGuess)
                  : 80
              }
              guessNumber={gameState ? gameState.currentGuess + 1 : 1}
            />
          </div>

          {/* Right column */}
          <div className="flex w-full max-w-[480px] flex-col gap-[22px]">
            <div>
              <div className="mb-2.5 text-[11px] uppercase tracking-[0.22em] text-amber">
                Today&apos;s poster
              </div>
              <h1 className="font-serif text-[52px] font-medium leading-[1.02] tracking-[-0.015em] text-cn-text">
                Name the <em className="italic text-amber">movie</em> behind the
                pixels.
              </h1>
              <p className="mt-3.5 max-w-[420px] text-[14.5px] leading-[1.55] text-cn-dim">
                Five guesses. Each one sharpens the image. Type a title or skip
                to peel away another layer.
              </p>
            </div>

            {isLoading || !gameState || !currentMovie ? (
              <div className="py-8 text-sm uppercase tracking-[0.14em] text-cn-faint">
                Loading today&apos;s movie…
              </div>
            ) : (
              <>
                <GuessList gameState={gameState} correctMovie={currentMovie} />

                <MovieSearch
                  onSelect={handleMovieSelect}
                  disabled={gameState.isComplete}
                />

                <div className="flex items-center justify-between text-xs text-cn-faint">
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={gameState.isComplete}
                    className="cursor-pointer underline decoration-cn-faint underline-offset-[3px] transition-colors hover:text-cn-dim disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Skip — sharpen anyway
                  </button>
                  <span>
                    Streak ·{" "}
                    <span className="text-cn-text">
                      {currentStreak ?? 0} days
                    </span>
                  </span>
                </div>

                <ScoreDisplay
                  gameState={gameState}
                  correctMovie={currentMovie}
                  onOpenStats={() => setStatsOpen(true)}
                />
              </>
            )}
          </div>
        </div>
      )}

      <UserStats
        isOpen={statsOpen}
        onOpenChange={setStatsOpen}
        gameState={gameState}
        correctMovie={currentMovie}
      />
    </div>
  );
};
