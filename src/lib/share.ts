import type { GameState } from "@/lib/game";
import { areMoviesRelated } from "@/lib/game";
import type { Movie } from "@/lib/tmdb";

/**
 * Builds the share text (emoji grid + score line + URL).
 * Uses 🟩 correct, 🟧 skipped, 🟨 related, 🟥 wrong, ⬛ not attempted.
 */
export function getShareText(
  gameState: GameState,
  correctMovie: Movie,
): string {
  const gameId = gameState.gameId;
  const dateParts = gameId.split("-");
  const dayNumber =
    parseInt(dateParts[0] + dateParts[1] + dateParts[2], 10) % 10000;

  const emojis: string[] = [];
  for (let i = 0; i < 5; i++) {
    if (i < gameState.guesses.length) {
      const guess = gameState.guesses[i];
      const isCorrect =
        guess.movieId !== undefined && guess.movieId === correctMovie.id;
      const isRelated = !isCorrect && areMoviesRelated(guess, correctMovie);
      if (isCorrect) {
        emojis.push("🟩");
      } else if (guess.skipped) {
        emojis.push("🟧");
      } else if (isRelated) {
        emojis.push("🟨");
      } else {
        emojis.push("🟥");
      }
    } else {
      emojis.push("⬛");
    }
  }

  const emojiGrid = emojis.join("");
  const scoreText = gameState.won ? `🎉 ${gameState.currentGuess}/5` : "❌ 0/5";

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.hostname +
        (window.location.port ? `:${window.location.port}` : "")
      : (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ??
        "localhost:3000");

  const isProduction =
    typeof window !== "undefined"
      ? window.location.protocol === "https:"
      : process.env.NEXT_PUBLIC_VERCEL_ENV === "production";
  const protocol = isProduction ? "https" : "http";
  const url = `${protocol}://${baseUrl}`;

  return `#PosterQuest #${dayNumber}\n${emojiGrid} ${scoreText}\n${url}`;
}

/**
 * Copies the given text to the clipboard.
 * Tries navigator.clipboard first, then document.execCommand fallback.
 * Call from a user gesture (e.g. click) so clipboard API works reliably.
 * @returns true if copy succeeded, false otherwise.
 */
export async function copyShareToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to fallback
    }
  }

  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}
