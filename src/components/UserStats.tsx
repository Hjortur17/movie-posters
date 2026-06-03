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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
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

function Metric({
  label,
  value,
  unit,
  sub,
  big,
  highlight,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  big?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="border-r border-line px-5 py-[18px]">
      <div className="text-[10px] uppercase tracking-[0.2em] text-cn-dim">
        {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span
          className={`font-serif font-medium leading-none tracking-[-0.02em] ${
            big ? "text-5xl" : "text-4xl"
          } ${highlight ? "text-amber" : "text-cn-text"}`}
        >
          {value}
        </span>
        {unit && <span className="font-serif text-xl text-cn-dim">{unit}</span>}
      </div>
      {sub && <div className="mt-1 text-[11px] text-cn-faint">{sub}</div>}
    </div>
  );
}

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
        className="max-h-[90vh] w-full max-w-[640px] overflow-y-auto border-line-strong bg-(--cn-bg) p-0 text-cn-text sm:rounded-none"
      >
        <div className="flex flex-col px-8 pb-8 pt-7">
          {/* Header */}
          <DialogHeader className="mb-6 flex flex-row items-baseline justify-between space-y-0 text-left">
            <div>
              <DialogDescription className="mb-1.5 text-[11px] uppercase tracking-[0.22em] text-amber">
                Your reel
              </DialogDescription>
              <DialogTitle className="font-serif text-4xl font-medium tracking-[-0.01em] text-cn-text">
                Statistics
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer border border-line-strong px-3.5 py-2 text-[11px] uppercase tracking-[0.16em] text-cn-dim transition-colors hover:text-cn-text"
            >
              Close
            </button>
          </DialogHeader>

          {isLoading && (
            <div className="py-8 text-center text-cn-dim">
              Loading statistics…
            </div>
          )}

          {error && (
            <div className="py-8 text-center">
              <div className="mb-2 text-crimson">Error loading statistics</div>
              <div className="text-sm text-cn-dim">{error}</div>
            </div>
          )}

          {!isLoading && !error && (
            <>
              {/* Metric grid */}
              <div className="grid grid-cols-3 border-t border-b border-line">
                <Metric
                  label="Win rate"
                  value={String(Math.round(stats.winRate))}
                  unit="%"
                  big
                  highlight
                />
                <Metric label="Played" value={String(stats.played)} />
                <Metric
                  label="Streak"
                  value={String(stats.currentStreak)}
                  sub="current"
                />
              </div>
              <div className="grid grid-cols-3 border-b border-line">
                <Metric
                  label="Avg. guesses"
                  value={stats.won > 0 ? stats.avgGuesses.toFixed(1) : "—"}
                />
                <Metric
                  label="Best"
                  value={stats.best !== null ? String(stats.best) : "—"}
                  sub="guesses to win"
                />
                <Metric
                  label="Longest streak"
                  value={String(stats.longestStreak)}
                />
              </div>

              {/* Distribution */}
              <div className="mt-7 flex flex-col">
                <div className="mb-3.5 text-[11px] uppercase tracking-[0.2em] text-cn-dim">
                  Wins by guess number
                </div>
                <div className="flex flex-col gap-1.5">
                  {stats.winsByGuess.map((count, i) => {
                    const pct = stats.won > 0 ? (count / stats.won) * 100 : 0;
                    const isModal = count === maxWins && count > 0;
                    return (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: fixed 5 guess slots, index is the row identity
                        key={`guess-slot-${i}`}
                        className="grid items-center gap-3.5 py-1"
                        style={{ gridTemplateColumns: "36px 1fr 60px" }}
                      >
                        <span className="font-serif text-base italic text-cn-dim">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="relative h-[26px] border border-line bg-ink">
                          <div
                            className="h-full transition-[width] duration-[400ms] ease-out"
                            style={{
                              width: `${Math.min(pct * 2, 100)}%`,
                              backgroundColor: isModal
                                ? "var(--cn-amber)"
                                : "var(--cn-amber-dim)",
                            }}
                          />
                          <span
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold"
                            style={{
                              color: isModal
                                ? "var(--cn-bg)"
                                : "var(--cn-text)",
                            }}
                          >
                            {count}
                          </span>
                        </div>
                        <span className="text-right text-xs text-cn-faint">
                          {Math.round(pct)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer card */}
              <div className="mt-5 flex items-center justify-between border border-line bg-ink p-3.5">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-cn-faint">
                    Next poster in
                  </div>
                  <div className="mt-0.5 font-serif text-[22px] tabular-nums text-amber">
                    {countdown}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={!canShare}
                  className="cursor-pointer bg-amber px-[22px] py-3 text-xs font-semibold uppercase tracking-[0.18em] text-(--cn-bg) transition-colors hover:bg-amber-hover disabled:cursor-not-allowed disabled:opacity-40"
                  title={
                    canShare
                      ? "Copy your result"
                      : "Finish today's puzzle to share"
                  }
                >
                  {shareCopied ? "Copied!" : "Share result"}
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
