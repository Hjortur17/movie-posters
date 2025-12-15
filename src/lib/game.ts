import type { Movie } from "./tmdb";

export interface Guess {
  title: string;
  year?: number;
  collectionId?: number | null;
  movieId?: number; // Store movie ID for accurate comparison
  directorId?: number | null;
  genreIds?: number[];
  productionCompanyIds?: number[];
}

export interface GameState {
  gameId: string;
  movieId: number;
  movieTitle: string;
  guesses: Guess[];
  currentGuess: number;
  isComplete: boolean;
  won: boolean;
  score: number;
}

export function getDailyGameId(date: Date): string {
  // Format: YYYY-MM-DD
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getPixelationLevel(guessNumber: number): number {
  // Progressive pixelation: 80% → 60% → 40% → 25% → 15%
  // Lower levels = more pixels/details visible for guessing
  // Increased levels to ensure image stays pixelated
  const levels = [80, 60, 40, 25, 15];
  if (guessNumber < 0) guessNumber = 0;
  if (guessNumber >= levels.length) guessNumber = levels.length - 1;
  return levels[guessNumber];
}

// Check if two movies are related (same franchise, director, or significant genre overlap)
// Made stricter to avoid false positives
export function areMoviesRelated(
  guess: Guess,
  correctMovie: {
    id: number;
    belongs_to_collection?: { id: number } | null;
    director_id?: number;
    genres?: Array<{ id: number }>;
    production_companies?: Array<{ id: number }>;
  }
): boolean {
  // Same franchise/collection - strongest relationship
  if (
    guess.collectionId !== null &&
    guess.collectionId !== undefined &&
    correctMovie.belongs_to_collection?.id &&
    guess.collectionId === correctMovie.belongs_to_collection.id
  ) {
    return true;
  }

  // Same director - strong relationship
  if (
    guess.directorId !== null &&
    guess.directorId !== undefined &&
    correctMovie.director_id &&
    guess.directorId === correctMovie.director_id
  ) {
    return true;
  }

  // Shared genres - require at least 3 common genres to avoid false positives
  // Many blockbuster movies share common genres (Action, Adventure, etc.)
  if (
    guess.genreIds &&
    guess.genreIds.length > 0 &&
    correctMovie.genres &&
    correctMovie.genres.length > 0
  ) {
    const correctGenreIds = correctMovie.genres.map((g) => g.id);
    const commonGenres = guess.genreIds.filter((id) =>
      correctGenreIds.includes(id)
    );
    // Require at least 3 common genres to be considered related
    if (commonGenres.length >= 3) {
      return true;
    }
  }

  // Production company check removed - too many false positives
  // Major studios produce many unrelated movies

  return false;
}

export function calculateScore(
  guessNumber: number,
  isCorrect: boolean
): number {
  if (!isCorrect) {
    return 0;
  }
  // Score based on which guess was correct (1-5)
  // Higher score for fewer guesses
  const scores = [100, 80, 60, 40, 20];
  if (guessNumber < 1 || guessNumber > 5) {
    return 0;
  }
  return scores[guessNumber - 1];
}

export function createInitialGameState(
  gameId: string,
  movie: Movie
): GameState {
  return {
    gameId,
    movieId: movie.id,
    movieTitle: movie.title,
    guesses: [],
    currentGuess: 0,
    isComplete: false,
    won: false,
    score: 0,
  };
}

export function updateGameState(
  state: GameState,
  guess: Guess,
  isCorrect: boolean
): GameState {
  const newGuesses = [...state.guesses, guess];
  const newGuessNumber = state.currentGuess + 1;
  const won = isCorrect || state.won;
  const isComplete = won || newGuessNumber >= 5;
  const score = isCorrect ? calculateScore(newGuessNumber, true) : state.score;

  return {
    ...state,
    guesses: newGuesses,
    currentGuess: newGuessNumber,
    isComplete,
    won,
    score,
  };
}
