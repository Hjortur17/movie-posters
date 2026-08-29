"use client";

import { useEffect, useState } from "react";
import {
  formatCountdown,
  type GameState,
  getMsUntilNextUTCMidnight,
} from "@/lib/game";
import { getUserScores } from "@/lib/scores";
import { copyShareToClipboard, getShareText } from "@/lib/share";
import { type DerivedStats, deriveStats } from "@/lib/stats";
import type { Movie } from "@/lib/tmdb";
import { getAnonymousId } from "@/lib/user";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog";

interface UserStatsProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  gameState?: GameState | null;
  correctMovie?: Movie | null;
}

const EMPTY: DerivedStats = {
  played: 0,
  won: 0,
  winRate: 0,
  avgGuesses: 0,
  best: null,
  currentStreak: 0,
  longestStreak: 0,
  winsByGuess: [0, 0, 0, 0, 0],
};

const Tile = ({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className: string;
}) => (
  <div className="border-[3px] border-pq-line-dim bg-pq-panel-2 px-2 py-3.5 text-center">
    <div className={cn("font-press text-press-2xl", className)}>{value}</div>
    <div className="mt-1.5 text-body-xs text-pq-muted tracking-pq-1">
      {label}
    </div>
  </div>
);

export const UserStats = ({
  isOpen,
  onOpenChange,
  gameState,
  correctMovie,
}: UserStatsProps) => {
  const [stats, setStats] = useState<DerivedStats>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState("00:00:00");
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const anonymousId = getAnonymousId();
        const scores = await getUserScores(anonymousId);
        setStats(deriveStats(scores));
      } catch (err) {
        console.error("Error loading stats:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load statistics",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, [isOpen]);

  // Live countdown to next UTC midnight while the modal is open.
  useEffect(() => {
    if (!isOpen) return;
    const tick = () =>
      setCountdown(formatCountdown(getMsUntilNextUTCMidnight()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isOpen]);

  const maxWins = Math.max(...stats.winsByGuess, 1);
  const canShare = Boolean(gameState?.isComplete && correctMovie);

  const handleShare = async () => {
    if (!gameState?.isComplete || !correctMovie) return;
    const text = getShareText(gameState, correctMovie);
    const ok = await copyShareToClipboard(text);
    if (ok) {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } else if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        /* user cancelled */
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[520px] overflow-y-auto border-4 border-pq-line bg-pq-panel p-[30px] text-pq-text shadow-pq-modal">
        <div className="mb-6 flex items-center justify-between gap-4">
          <DialogTitle className="font-press text-pq-amber text-press-xl tracking-pq-2">
            HIGH SCORES
          </DialogTitle>
          <DialogDescription className="sr-only">
            Your PosterQuest record: games played, win rate, streaks and guess
            distribution.
          </DialogDescription>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close statistics"
            className="pq-close text-press-md"
          >
            [X]
          </button>
        </div>

        {isLoading && (
          <div className="py-8 text-center text-body-md text-pq-muted tracking-pq-1">
            LOADING…
          </div>
        )}

        {error && (
          <div className="py-8 text-center">
            <div className="mb-2 font-press text-pq-red text-press-md tracking-pq-1">
              ERROR LOADING STATS
            </div>
            <div className="text-body-md text-pq-muted">{error}</div>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <div className="mb-7 grid grid-cols-4 gap-3">
              <Tile
                value={String(stats.played)}
                label="PLAYED"
                className="text-pq-amber"
              />
              <Tile
                value={`${Math.round(stats.winRate)}%`}
                label="WIN"
                className="text-pq-green"
              />
              <Tile
                value={String(stats.currentStreak)}
                label="STREAK"
                className="text-pq-amber"
              />
              <Tile
                value={String(stats.longestStreak)}
                label="BEST"
                className="text-pq-red"
              />
            </div>

            <div className="mb-4 font-press text-pq-muted text-press-sm tracking-pq-2">
              GUESS DISTRIBUTION
            </div>
            <div className="flex flex-col gap-2.5">
              {stats.winsByGuess.map((count, i) => {
                const pct = (count / maxWins) * 100;
                const isModal = count === maxWins && count > 0;
                return (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed 5 guess slots, index is the row identity
                    key={`guess-slot-${i}`}
                    className="grid grid-cols-[32px_1fr] items-center gap-3"
                  >
                    <span className="font-press text-pq-faint text-press-sm">
                      {i + 1}
                    </span>
                    <div className="relative h-[22px] border-2 border-pq-line-dim bg-pq-panel-2">
                      {count > 0 ? (
                        <div
                          className={cn(
                            "flex h-full items-center justify-end pr-2 text-body-xs tracking-pq-1 transition-[width] duration-300 ease-out",
                            isModal
                              ? "bg-pq-amber text-pq-bg"
                              : "bg-pq-line text-pq-text",
                          )}
                          style={{ width: `${Math.max(pct, 12)}%` }}
                        >
                          {count}
                        </div>
                      ) : (
                        <span className="-translate-y-1/2 absolute top-1/2 left-2 text-body-xs text-pq-faint">
                          0
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Next drop + share */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-[3px] border-pq-line-dim bg-pq-footer p-3.5">
              <div>
                <div className="font-press text-pq-faint text-press-xs tracking-pq-2">
                  NEXT POSTER IN
                </div>
                <div className="mt-1.5 font-press text-pq-amber text-press-2xl tabular-nums">
                  {countdown}
                </div>
              </div>
              <button
                type="button"
                onClick={handleShare}
                disabled={!canShare}
                title={
                  canShare
                    ? "Copy your result"
                    : "Finish today's puzzle to share"
                }
                className="pq-btn pq-btn--primary px-5 py-3 text-press-md"
              >
                {shareCopied ? "✓ COPIED" : "⇪ SHARE"}
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
