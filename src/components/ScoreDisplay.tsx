"use client";

import { useEffect, useState } from "react";
import type { GameState } from "@/lib/game";
import { copyShareToClipboard, getShareText } from "@/lib/share";
import type { Movie } from "@/lib/tmdb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface ScoreDisplayProps {
  gameState: GameState;
  correctMovie: Movie;
  onOpenStats: () => void;
}

const ShareResultButton = ({
  gameState,
  correctMovie,
}: {
  gameState: GameState;
  correctMovie: Movie;
}) => {
  const [copied, setCopied] = useState(false);
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
    <button
      type="button"
      onClick={handleShare}
      className="cursor-pointer bg-amber px-[22px] py-3 text-xs font-semibold uppercase tracking-[0.18em] text-(--cn-bg) transition-colors hover:bg-amber-hover"
    >
      {copied ? "Copied!" : "Share result"}
    </button>
  );
};

const StatsButton = ({ onOpenStats }: { onOpenStats: () => void }) => (
  <button
    type="button"
    onClick={onOpenStats}
    className="cursor-pointer border border-line-strong px-[22px] py-3 text-xs font-semibold uppercase tracking-[0.18em] text-cn-dim transition-colors hover:text-cn-text"
  >
    View stats
  </button>
);

export const ScoreDisplay = ({
  gameState,
  correctMovie,
  onOpenStats,
}: ScoreDisplayProps) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (gameState.isComplete && gameState.won) {
      setIsOpen(true);
    }
  }, [gameState.isComplete, gameState.won]);

  if (!gameState.isComplete) {
    return null;
  }

  const year = correctMovie.release_date
    ? new Date(correctMovie.release_date).getFullYear()
    : null;

  if (gameState.won) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          showClose
          className="w-full max-w-[480px] border-line-strong bg-(--cn-bg) p-8 text-cn-text sm:rounded-none"
        >
          <DialogHeader className="space-y-0 text-left">
            <DialogDescription className="mb-1.5 text-[11px] uppercase tracking-[0.22em] text-amber">
              Curtains
            </DialogDescription>
            <DialogTitle className="font-serif text-4xl font-medium tracking-[-0.01em] text-cn-text">
              You named it.
            </DialogTitle>
          </DialogHeader>
          <p className="text-[14.5px] leading-[1.55] text-cn-dim">
            Solved in{" "}
            <span className="text-cn-text">{gameState.currentGuess}</span> of 5
            — <span className="text-cn-text">{correctMovie.title}</span>
            {year && <span className="text-cn-dim"> ({year})</span>}.
          </p>
          <div className="mt-2 flex gap-3">
            <ShareResultButton
              gameState={gameState}
              correctMovie={correctMovie}
            />
            <StatsButton onOpenStats={onOpenStats} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Loss — inline dark reveal
  return (
    <div className="border border-line-strong bg-ink p-5">
      <div className="mb-1.5 text-[11px] uppercase tracking-[0.22em] text-crimson">
        Out of guesses
      </div>
      <div className="font-serif text-2xl text-cn-text">
        {correctMovie.title}
        {year && <span className="text-cn-dim"> ({year})</span>}
      </div>
      <div className="mt-4 flex gap-3">
        <ShareResultButton gameState={gameState} correctMovie={correctMovie} />
        <StatsButton onOpenStats={onOpenStats} />
      </div>
    </div>
  );
};
