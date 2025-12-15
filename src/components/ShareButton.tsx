"use client";

import { useState } from "react";
import type { GameState } from "@/lib/game";
import type { Movie } from "@/lib/tmdb";

interface ShareButtonProps {
  gameState: GameState;
  correctMovie: Movie;
}

export const ShareButton = ({ gameState, correctMovie }: ShareButtonProps) => {
  const [copied, setCopied] = useState(false);

  const generateShareText = (): string => {
    const gameId = gameState.gameId;
    // Extract day number from game ID (YYYY-MM-DD format)
    // Calculate a consistent day number from the date
    const dateParts = gameId.split("-");
    const dayNumber =
      parseInt(dateParts[0] + dateParts[1] + dateParts[2], 10) % 10000;

    // Generate emoji grid: 🟥 = wrong, 🟩 = correct, ⬛ = not attempted
    const emojis: string[] = [];
    for (let i = 0; i < 5; i++) {
      if (i < gameState.guesses.length) {
        // Check if this specific guess was correct
        const guess = gameState.guesses[i];
        // Use movie ID for accurate comparison
        const isCorrect = guess.movieId === correctMovie.id;
        emojis.push(isCorrect ? "🟩" : "🟥");
      } else {
        emojis.push("⬛");
      }
    }

    const emojiGrid = emojis.join("");
    const scoreText = gameState.won
      ? `🎉 ${gameState.currentGuess}/5`
      : "❌ 0/5";

    // Get URL from Vercel environment variables or current location
    // Client-side component, so use NEXT_PUBLIC_ prefixed vars or window.location
    const baseUrl =
      process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ||
      (typeof window !== "undefined"
        ? window.location.hostname +
          (window.location.port ? `:${window.location.port}` : "")
        : "localhost:3000");

    const isProduction =
      process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
      (typeof window !== "undefined" && window.location.protocol === "https:");

    const protocol = isProduction ? "https" : "http";
    const url = `${protocol}://${baseUrl}`;

    return `#PosterQuest #${dayNumber}\n${emojiGrid} ${scoreText}\n${url}`;
  };

  const handleShare = async () => {
    const shareText = generateShareText();

    try {
      if (navigator.share) {
        await navigator.share({
          text: shareText,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // If sharing fails, try clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (clipboardError) {
        console.error("Failed to copy to clipboard:", clipboardError);
      }
    }
  };

  if (!gameState.isComplete) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="px-6 py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors"
    >
      {copied ? "Copied!" : "Share Score"}
    </button>
  );
};
