import { areMoviesRelated, type Guess } from "./game";
import type { Movie } from "./tmdb";

/** How a single guess row reads: shared by the guess list, the pips and the share grid. */
export type GuessKind = "hit" | "link" | "miss" | "skipped";

/** Classify one submitted guess against the answer. */
export function getGuessKind(guess: Guess, correctMovie: Movie): GuessKind {
  if (guess.skipped) return "skipped";

  const isCorrect = guess.movieId
    ? guess.movieId === correctMovie.id
    : guess.title.toLowerCase().trim() ===
      correctMovie.title.toLowerCase().trim();
  if (isCorrect) return "hit";

  return areMoviesRelated(guess, correctMovie) ? "link" : "miss";
}

/** Emoji square per kind, used for both the on-screen grid and the copied share text. */
export const KIND_SQUARE: Record<GuessKind, string> = {
  hit: "🟩",
  link: "🟨",
  miss: "🟥",
  skipped: "🟧",
};

/** Square for a slot that was never played. */
export const EMPTY_SQUARE = "⬛";
