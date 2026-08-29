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
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";

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
  const accentBorder = won ? "border-pq-green" : "border-pq-red";
  const accentText = won ? "text-pq-green" : "text-pq-red";
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
        className={cn(
          "max-h-[90vh] max-w-[520px] overflow-y-auto border-4 bg-pq-panel p-[30px] text-pq-text shadow-pq-modal",
          accentBorder,
        )}
      >
        <div className="mb-[18px] flex items-start justify-between gap-4">
          <DialogTitle
            className={cn(
              "font-press text-press-3xl leading-[1.5] tracking-pq-2",
              accentText,
            )}
          >
            {won ? "★ NICE RUN" : "GAME OVER"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Today&apos;s result: the answer, your score, and a shareable grid.
          </DialogDescription>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close result"
            className="pq-close text-press-md"
          >
            [X]
          </button>
        </div>

        <div className="mb-2 text-body-xl text-pq-dim tracking-pq-1">
          THE FILM WAS{" "}
          <span className="text-pq-text">
            {correctMovie.title.toUpperCase()}
          </span>
          {year && ` (${year})`} —{" "}
          {won
            ? `SOLVED IN ${gameState.currentGuess} / 5`
            : "BETTER LUCK TOMORROW"}
        </div>

        <div className="mb-5 font-press text-pq-amber text-press-md tracking-pq-1">
          SCORE {gameState.score} PTS
        </div>

        {/* Shareable result card */}
        <div className="mb-[22px] border-[3px] border-pq-line-dim bg-pq-footer p-4">
          <div className="mb-2.5 font-press text-pq-faint text-press-xs tracking-pq-2">
            #POSTERQUEST #{getShareDayNumber(gameState)}
          </div>
          <div className="text-body-2xl leading-none tracking-pq-6">
            {getShareSquares(gameState, correctMovie).join("")}
          </div>
        </div>

        <div className="flex flex-wrap gap-3.5">
          <button
            type="button"
            onClick={handleShare}
            className="pq-btn pq-btn--primary px-5 py-3.5 text-press-md"
          >
            {copied ? "✓ COPIED" : "⇪ SHARE SCORE"}
          </button>
          <button
            type="button"
            onClick={onOpenStats}
            className="pq-btn pq-btn--ghost px-[18px] py-2.5 text-press-md"
          >
            HIGH SCORES
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
