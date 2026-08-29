"use client";

import type { GameState } from "@/lib/game";
import { getGuessKind } from "@/lib/guess-kind";
import type { Movie } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

interface GuessListProps {
  gameState: GameState;
  correctMovie?: Movie;
}

type RowKind = "hit" | "miss" | "link" | "skipped" | "active" | "locked";

/**
 * Per-state classes for a row: the left edge bar, the status text, and the
 * matching pip under the poster. Written as whole class names because the
 * Tailwind scanner only sees complete literal strings — never build these by
 * interpolating a colour name.
 */
const ROW_STYLE: Record<RowKind, { edge: string; label: string; pip: string }> =
  {
    hit: {
      edge: "border-l-pq-green",
      label: "text-pq-green",
      pip: "bg-pq-green",
    },
    miss: { edge: "border-l-pq-red", label: "text-pq-red", pip: "bg-pq-red" },
    link: {
      edge: "border-l-pq-amber",
      label: "text-pq-amber",
      pip: "bg-pq-amber",
    },
    skipped: {
      edge: "border-l-pq-skip",
      label: "text-pq-skip",
      pip: "bg-pq-skip",
    },
    active: {
      edge: "border-l-pq-cyan",
      label: "text-pq-cyan",
      pip: "bg-pq-cyan",
    },
    locked: {
      edge: "border-l-pq-line-dim",
      label: "text-pq-line-dim",
      // An untouched slot reads as an empty socket, not as a coloured result.
      pip: "bg-pq-panel-2",
    },
  };

const STATUS_LABEL: Record<RowKind, string> = {
  hit: "HIT",
  miss: "MISS",
  link: "LINK",
  skipped: "SKIP",
  active: "ACTIVE",
  locked: "LOCKED",
};

/** Resolve the state of row `i` on the board. */
export function getRowKind(
  gameState: GameState,
  index: number,
  correctMovie?: Movie,
): RowKind {
  const guess = gameState.guesses[index];
  if (guess) {
    return correctMovie ? getGuessKind(guess, correctMovie) : "miss";
  }
  if (!gameState.isComplete && index === gameState.currentGuess) {
    return "active";
  }
  return "locked";
}

export const GuessList = ({ gameState, correctMovie }: GuessListProps) => {
  return (
    <div className="flex flex-col gap-[clamp(3px,0.8vh,7px)]">
      {Array.from({ length: 5 }, (_, i) => {
        const guess = gameState.guesses[i];
        const kind = getRowKind(gameState, i, correctMovie);
        const isActive = kind === "active";
        const isLocked = kind === "locked";

        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed 5 guess slots, index is the row identity
            key={`guess-row-${i}`}
            className={cn(
              "grid min-h-[clamp(24px,4.4vh,44px)] grid-cols-[38px_1fr_auto] items-center gap-3 border-[3px] px-3.5 py-[clamp(3px,0.7vh,7px)]",
              isActive
                ? "border-pq-active-line bg-pq-active-bg"
                : isLocked
                  ? "border-pq-line-faint bg-transparent"
                  : "border-pq-line-dim bg-pq-panel",
              // Keep the left edge after the all-sides border so it wins.
              "border-l-8",
              ROW_STYLE[kind].edge,
            )}
          >
            <span
              className={cn(
                "font-press text-press-lg",
                isActive
                  ? "text-pq-cyan"
                  : isLocked
                    ? "text-pq-locked"
                    : "text-pq-faint",
              )}
            >
              {String(i + 1).padStart(2, "0")}
            </span>

            <span
              className={cn(
                "truncate text-body-xs tracking-pq-1 lg:text-fluid-lg",
                isActive
                  ? "text-pq-cyan"
                  : isLocked
                    ? "text-pq-locked"
                    : kind === "skipped"
                      ? "text-pq-faint"
                      : "text-pq-text",
              )}
            >
              {guess && !guess.skipped ? (
                <>
                  {guess.title.toUpperCase()}
                  {guess.year && (
                    <span className="ml-2 text-pq-muted">({guess.year})</span>
                  )}
                </>
              ) : guess?.skipped ? (
                "SKIPPED THIS TURN"
              ) : isActive ? (
                "YOUR TURN —"
              ) : (
                "—"
              )}
            </span>

            <span
              className={cn(
                "font-press text-press-xs tracking-pq-2",
                ROW_STYLE[kind].label,
              )}
            >
              {STATUS_LABEL[kind]}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/** Five-segment progress strip that mirrors the guess rows under the poster. */
export const GuessPips = ({ gameState, correctMovie }: GuessListProps) => (
  <div className="flex gap-1.5">
    {Array.from({ length: 5 }, (_, i) => {
      const kind = getRowKind(gameState, i, correctMovie);
      return (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed 5 guess slots, index is the pip identity
          key={`pip-${i}`}
          className={cn(
            "h-3 flex-1 border-2 border-pq-line-dim",
            ROW_STYLE[kind].pip,
          )}
        />
      );
    })}
  </div>
);
