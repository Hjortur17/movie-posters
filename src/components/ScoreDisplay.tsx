"use client";

import { useState } from "react";
import type { GameState } from "@/lib/game";
import {
  copyShareToClipboard,
  getShareDayNumber,
  getShareSquares,
  getShareText,
} from "@/lib/share";
import type { Movie } from "@/lib/tmdb";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";

interface ScoreDisplayProps {
  gameState: GameState;
  correctMovie: Movie;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenStats: () => void;
}

export const ScoreDisplay = ({
  gameState,
  correctMovie,
  open,
  onOpenChange,
  onOpenStats,
}: ScoreDisplayProps) => {
  const [copied, setCopied] = useState(false);

  if (!gameState.isComplete) {
    return null;
  }

  const won = gameState.won;
  const accent = won ? "var(--pq-green)" : "var(--pq-red)";
  const year = correctMovie.release_date
    ? new Date(correctMovie.release_date).getFullYear()
    : null;

  const handleShare = async () => {
    const text = getShareText(gameState, correctMovie);
    const ok = await copyShareToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        /* cancelled */
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        className="max-h-[90vh] max-w-[520px] overflow-y-auto border-4 bg-pq-panel p-[30px] text-pq-text"
        style={{
          borderColor: accent,
          boxShadow: "14px 14px 0 rgba(0,0,0,0.7)",
        }}
      >
        <div className="mb-[18px] flex items-start justify-between gap-4">
          <DialogTitle
            className="font-press text-[15px] leading-[1.5] tracking-[2px]"
            style={{ color: accent }}
          >
            {won ? "★ NICE RUN" : "GAME OVER"}
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close result"
            className="pq-close text-[10px]"
          >
            [X]
          </button>
        </div>

        <div className="mb-2 text-[22px] tracking-[1px] text-pq-dim">
          THE FILM WAS{" "}
          <span className="text-pq-text">
            {correctMovie.title.toUpperCase()}
          </span>
          {year && ` (${year})`} —{" "}
          {won
            ? `SOLVED IN ${gameState.currentGuess} / 5`
            : "BETTER LUCK TOMORROW"}
        </div>

        <div className="mb-5 font-press text-[10px] tracking-[1px] text-pq-amber">
          SCORE {gameState.score} PTS
        </div>

        {/* Shareable result card */}
        <div className="mb-[22px] border-[3px] border-pq-line-dim bg-pq-footer p-4">
          <div className="mb-2.5 font-press text-[8px] tracking-[2px] text-pq-faint">
            #POSTERQUEST #{getShareDayNumber(gameState)}
          </div>
          <div className="text-[26px] leading-none tracking-[6px]">
            {getShareSquares(gameState, correctMovie).join("")}
          </div>
        </div>

        <div className="flex flex-wrap gap-3.5">
          <button
            type="button"
            onClick={handleShare}
            className="pq-btn pq-btn--primary px-5 py-3.5 text-[10px]"
          >
            {copied ? "✓ COPIED" : "⇪ SHARE SCORE"}
          </button>
          <button
            type="button"
            onClick={onOpenStats}
            className="pq-btn pq-btn--ghost px-[18px] py-2.5 text-[10px]"
          >
            HIGH SCORES
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
