"use client";

import { useState } from "react";
import type { GameState } from "@/lib/game";
import type { Movie } from "@/lib/tmdb";
import { getShareText, copyShareToClipboard } from "@/lib/share";

interface ShareButtonProps {
  gameState: GameState;
  correctMovie: Movie;
}

export const ShareButton = ({ gameState, correctMovie }: ShareButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!gameState?.isComplete || !correctMovie) {
      return;
    }
    const shareText = getShareText(gameState, correctMovie);
    const success = await copyShareToClipboard(shareText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        // Fall through to alert
      }
    }
    alert(`Share this text:\n\n${shareText}\n\n(Please copy manually)`);
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
