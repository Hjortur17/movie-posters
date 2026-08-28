import type { GameState } from "@/lib/game";
import { getPuzzleNumber } from "@/lib/game";
import { EMPTY_SQUARE, getGuessKind, KIND_SQUARE } from "@/lib/guess-kind";
import type { Movie } from "@/lib/tmdb";

/**
 * The five result squares for a finished (or in-progress) board.
 * 🟩 correct, 🟨 related, 🟧 skipped, 🟥 wrong, ⬛ not attempted.
 * Rendered in the result modal and reused verbatim in the copied share text.
 */
export function getShareSquares(
  gameState: GameState,
  correctMovie: Movie,
): string[] {
  return Array.from({ length: 5 }, (_, i) => {
    const guess = gameState.guesses[i];
    return guess
      ? KIND_SQUARE[getGuessKind(guess, correctMovie)]
      : EMPTY_SQUARE;
  });
}

/** Puzzle number for the share caption — the same "NO." shown in the header. */
export function getShareDayNumber(gameState: GameState): number {
  const [y, m, d] = gameState.gameId.split("-").map(Number);
  return getPuzzleNumber(new Date(Date.UTC(y, m - 1, d)));
}

/**
 * Builds the share text (emoji grid + score line + URL).
 */
export function getShareText(
  gameState: GameState,
  correctMovie: Movie,
): string {
  const emojiGrid = getShareSquares(gameState, correctMovie).join("");
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

  return `#PosterQuest #${getShareDayNumber(gameState)}\n${emojiGrid} ${scoreText}\n${url}`;
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
