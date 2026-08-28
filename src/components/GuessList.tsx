"use client";

import type { GameState } from "@/lib/game";
import { getGuessKind } from "@/lib/guess-kind";
import type { Movie } from "@/lib/tmdb";

interface GuessListProps {
  gameState: GameState;
  correctMovie?: Movie;
}

type RowKind = "hit" | "miss" | "link" | "skipped" | "active" | "locked";

/** Left edge bar + status text colour for each row state. */
const ACCENT: Record<RowKind, string> = {
  hit: "var(--pq-green)",
  miss: "var(--pq-red)",
  link: "var(--pq-amber)",
  skipped: "var(--pq-skip)",
  active: "var(--pq-cyan)",
  locked: "var(--pq-line-dim)",
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
            className="grid min-h-[clamp(24px,4.4vh,44px)] items-center gap-3 border-[3px] px-3.5 py-[clamp(3px,0.7vh,7px)]"
            style={{
              gridTemplateColumns: "38px 1fr auto",
              borderColor: isActive
                ? "var(--pq-active-line)"
                : isLocked
                  ? "var(--pq-line-faint)"
                  : "var(--pq-line-dim)",
              borderLeft: `8px solid ${ACCENT[kind]}`,
              backgroundColor: isActive
                ? "var(--pq-active-bg)"
                : isLocked
                  ? "transparent"
                  : "var(--pq-panel)",
            }}
          >
            <span
              className="font-press text-[11px]"
              style={{
                color: isActive
                  ? "var(--pq-cyan)"
                  : isLocked
                    ? "var(--pq-locked)"
                    : "var(--pq-faint)",
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>

            <span
              className="truncate text-[17px] tracking-[1px] lg:text-[clamp(15px,2.5vh,21px)]"
              style={{
                color: isActive
                  ? "var(--pq-cyan)"
                  : isLocked
                    ? "var(--pq-locked)"
                    : kind === "skipped"
                      ? "var(--pq-faint)"
                      : "var(--pq-text)",
              }}
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
              className="font-press text-[8px] tracking-[2px]"
              style={{ color: ACCENT[kind] }}
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
          className="h-3 flex-1 border-2 border-pq-line-dim"
          style={{
            backgroundColor:
              kind === "locked" ? "var(--pq-panel-2)" : ACCENT[kind],
          }}
        />
      );
    })}
  </div>
);
