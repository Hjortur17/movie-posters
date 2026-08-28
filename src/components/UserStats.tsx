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
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";

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
  color,
}: {
  value: string;
  label: string;
  color: string;
}) => (
  <div className="border-[3px] border-pq-line-dim bg-pq-panel-2 px-2 py-3.5 text-center">
    <div className="font-press text-[13px]" style={{ color }}>
      {value}
    </div>
    <div className="mt-1.5 text-[17px] tracking-[1px] text-pq-muted">
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
      <DialogContent
        showClose={false}
        className="max-h-[90vh] max-w-[520px] overflow-y-auto border-4 border-pq-line bg-pq-panel p-[30px] text-pq-text"
        style={{ boxShadow: "14px 14px 0 rgba(0,0,0,0.7)" }}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <DialogTitle className="font-press text-xs tracking-[2px] text-pq-amber">
            HIGH SCORES
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close statistics"
            className="pq-close text-[10px]"
          >
            [X]
          </button>
        </div>

        {isLoading && (
          <div className="py-8 text-center text-[19px] tracking-[1px] text-pq-muted">
            LOADING…
          </div>
        )}

        {error && (
          <div className="py-8 text-center">
            <div className="mb-2 font-press text-[10px] tracking-[1px] text-pq-red">
              ERROR LOADING STATS
            </div>
            <div className="text-[19px] text-pq-muted">{error}</div>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <div className="mb-7 grid grid-cols-4 gap-3">
              <Tile
                value={String(stats.played)}
                label="PLAYED"
                color="var(--pq-amber)"
              />
              <Tile
                value={`${Math.round(stats.winRate)}%`}
                label="WIN"
                color="var(--pq-green)"
              />
              <Tile
                value={String(stats.currentStreak)}
                label="STREAK"
                color="var(--pq-amber)"
              />
              <Tile
                value={String(stats.longestStreak)}
                label="BEST"
                color="var(--pq-red)"
              />
            </div>

            <div className="mb-4 font-press text-[9px] tracking-[2px] text-pq-muted">
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
                    className="grid items-center gap-3"
                    style={{ gridTemplateColumns: "32px 1fr" }}
                  >
                    <span className="font-press text-[9px] text-pq-faint">
                      {i + 1}
                    </span>
                    <div className="relative h-[22px] border-2 border-pq-line-dim bg-pq-panel-2">
                      {count > 0 ? (
                        <div
                          className="flex h-full items-center justify-end pr-2 text-[17px] tracking-[1px] text-pq-bg transition-[width] duration-300 ease-out"
                          style={{
                            width: `${Math.max(pct, 12)}%`,
                            backgroundColor: isModal
                              ? "var(--pq-amber)"
                              : "var(--pq-line)",
                            color: isModal ? "var(--pq-bg)" : "var(--pq-text)",
                          }}
                        >
                          {count}
                        </div>
                      ) : (
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[17px] text-pq-faint">
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
                <div className="font-press text-[8px] tracking-[2px] text-pq-faint">
                  NEXT POSTER IN
                </div>
                <div className="mt-1.5 font-press text-[13px] tabular-nums text-pq-amber">
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
                className="pq-btn pq-btn--primary px-5 py-3 text-[10px]"
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
