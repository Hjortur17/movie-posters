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
import { GuessList, GuessPips } from "./GuessList";
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
  const [resultDismissed, setResultDismissed] = useState(false);
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
        // A game restored as already-finished shouldn't slam the modal open on load.
        setResultDismissed(state.isComplete);

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

  const finished = Boolean(gameState?.isComplete);
  const guessesMade = gameState?.currentGuess ?? 0;
  const resultOpen = finished && !resultDismissed && !statsOpen;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-pq-bg text-pq-text lg:h-dvh lg:overflow-hidden">
      {/* CRT overlays */}
      <div
        aria-hidden
        className="pq-scanlines pointer-events-none fixed inset-0 z-[60]"
      />
      <div
        aria-hidden
        className="pq-vignette pointer-events-none fixed inset-0 z-[61]"
      />

      <TopBar
        puzzleNumber={puzzleNumber}
        dateLabel={dateLabel}
        onOpenStats={() => setStatsOpen(true)}
      />

      {error ? (
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            <div className="mb-3 font-press text-pq-red text-press-xl leading-[1.6] tracking-pq-1">
              COULDN&apos;T LOAD TODAY&apos;S POSTER
            </div>
            <div className="mb-6 text-body-md text-pq-muted tracking-pq-1">
              {error}
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="pq-btn pq-btn--primary px-5 py-3.5 text-press-md"
            >
              ↺ RETRY
            </button>
          </div>
        </div>
      ) : (
        <div className="mx-auto grid w-full max-w-[1240px] flex-1 items-center gap-8 px-5 py-[clamp(10px,2.4vh,28px)] sm:px-10 lg:min-h-0 lg:grid-cols-[minmax(240px,0.72fr)_minmax(340px,1fr)] lg:gap-[clamp(24px,3vw,44px)] lg:overflow-hidden">
          {/* Poster column */}
          <div className="flex flex-col lg:min-h-0">
            <MoviePoster
              imageUrl={posterUrl}
              pixelationLevel={
                gameState
                  ? gameState.isComplete
                    ? 0
                    : getPixelationLevel(gameState.currentGuess)
                  : 80
              }
              guessNumber={guessesMade + 1}
              livesLeft={5 - guessesMade}
            />

            {gameState && (
              <div className="mt-[clamp(8px,1.6vh,16px)]">
                <GuessPips
                  gameState={gameState}
                  correctMovie={currentMovie ?? undefined}
                />
              </div>
            )}
            <div className="mt-[clamp(6px,1.2vh,10px)] text-body-xs text-pq-faint leading-[1.25] tracking-pq-1 lg:text-fluid-2xs">
              EVERY GUESS SHARPENS THE POSTER &amp; DROPS THE PIXELATION.
            </div>
          </div>

          {/* Board column */}
          <div className="flex w-full max-w-[560px] flex-col justify-center lg:h-full lg:min-h-0">
            <div className="mb-[clamp(6px,1.4vh,16px)] flex items-center gap-2.5">
              <div aria-hidden className="h-2.5 w-2.5 bg-pq-amber" />
              <span className="font-press text-pq-amber text-press-md tracking-pq-2">
                TODAY&apos;S POSTER
              </span>
              <span aria-hidden className="pq-caret h-[15px] w-2 bg-pq-amber" />
            </div>

            <h1 className="m-0 mb-[clamp(4px,0.9vh,8px)] font-press text-pq-text text-press-3xl leading-[1.5] [text-shadow:4px_4px_0_#251C31] lg:text-fluid-md">
              Name the
            </h1>
            <h1 className="m-0 mb-[clamp(8px,1.7vh,16px)] font-press text-pq-amber text-press-3xl leading-[1.5] [text-shadow:4px_4px_0_#3A2A05] lg:text-fluid-md">
              film behind the pixels.
            </h1>

            <p className="m-0 mb-[clamp(6px,1.5vh,18px)] max-w-[46ch] text-pretty text-body-md text-pq-dim leading-[1.35] lg:text-fluid-sm">
              Five guesses. 80% pixelated down to 0% — the poster is the only
              clue you get. New movie at midnight UTC.
            </p>

            {isLoading || !gameState || !currentMovie ? (
              <div className="py-8 font-press text-pq-faint text-press-md tracking-pq-1">
                LOADING TODAY&apos;S MOVIE…
              </div>
            ) : (
              <>
                <div className="mb-[clamp(6px,1.5vh,18px)]">
                  <GuessList
                    gameState={gameState}
                    correctMovie={currentMovie}
                  />
                </div>

                {finished ? (
                  <button
                    type="button"
                    onClick={() => setResultDismissed(false)}
                    className="pq-btn pq-btn--ghost self-start px-5 py-3.5 text-press-md"
                  >
                    SEE RESULT
                  </button>
                ) : (
                  <MovieSearch onSelect={handleMovieSelect} />
                )}

                <div className="mt-[clamp(6px,1.3vh,16px)] flex flex-wrap items-center justify-between gap-4 text-body-sm text-pq-faint tracking-pq-1 lg:text-fluid-xs">
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={finished}
                    className="pq-link-btn text-body-lg tracking-pq-1"
                  >
                    SKIP — REVEAL ANYWAY
                  </button>
                  <span>
                    STREAK ·{" "}
                    <span className="text-pq-amber">
                      {currentStreak ?? 0} DAYS
                    </span>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Arcade marquee stripe + footer */}
      <div aria-hidden className="pq-marquee h-2 flex-none" />
      <div className="flex flex-none flex-wrap items-center justify-between gap-4 bg-pq-footer px-5 py-[clamp(8px,1.5vh,14px)] font-press text-pq-faint text-press-xs tracking-pq-1 sm:px-10">
        <span>5 GUESSES · NEW MOVIE EVERY MIDNIGHT UTC</span>
        <a
          href="https://hjorturfreyr.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-pq-faint hover:text-pq-amber"
        >
          CREATOR HJÖRTUR FREYR
        </a>
        <a
          href="https://www.themoviedb.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-pq-faint hover:text-pq-amber"
        >
          POSTERS BY TMDB
        </a>
      </div>

      {gameState && currentMovie && (
        <ScoreDisplay
          gameState={gameState}
          correctMovie={currentMovie}
          open={resultOpen}
          onOpenChange={(open) => setResultDismissed(!open)}
          onOpenStats={() => {
            setResultDismissed(true);
            setStatsOpen(true);
          }}
        />
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
