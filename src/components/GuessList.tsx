"use client";

import type { GameState } from "@/lib/game";
import { areMoviesRelated } from "@/lib/game";
import type { Movie } from "@/lib/tmdb";

interface GuessListProps {
  gameState: GameState;
  correctMovie?: Movie;
}

type RowKind = "hit" | "miss" | "link" | "skipped" | "active" | "locked";

const ACCENT: Record<RowKind, string> = {
  hit: "var(--cn-good)",
  miss: "var(--cn-crimson)",
  link: "var(--cn-amber-dim)",
  skipped: "var(--cn-line-strong)",
  active: "var(--cn-amber)",
  locked: "var(--cn-line)",
};

const STATUS_LABEL: Record<RowKind, string> = {
  hit: "Hit",
  miss: "Miss",
  link: "Link",
  skipped: "Skipped",
  active: "Active",
  locked: "Locked",
};

const STATUS_COLOR: Record<RowKind, string> = {
  hit: "text-good",
  miss: "text-crimson",
  link: "text-amber",
  skipped: "text-cn-dim",
  active: "text-amber",
  locked: "text-cn-faint",
};

export const GuessList = ({ gameState, correctMovie }: GuessListProps) => {
  const rows = Array.from({ length: 5 }, (_, i) => i);

  return (
    <div className="flex flex-col gap-2">
      {rows.map((i) => {
        const guess = gameState.guesses[i];
        const isActive = !gameState.isComplete && i === gameState.currentGuess;

        let kind: RowKind = "locked";
        if (guess) {
          if (guess.skipped) {
            kind = "skipped";
          } else if (correctMovie) {
            const isCorrect = guess.movieId
              ? guess.movieId === correctMovie.id
              : guess.title.toLowerCase().trim() ===
                correctMovie.title.toLowerCase().trim();
            if (isCorrect && gameState.isComplete) {
              kind = "hit";
            } else if (!isCorrect && areMoviesRelated(guess, correctMovie)) {
              kind = "link";
            } else {
              kind = "miss";
            }
          } else {
            kind = "miss";
          }
        } else if (isActive) {
          kind = "active";
        }

        return (
          <div
            key={`guess-row-${i}`}
            className="grid min-h-[44px] items-center gap-3.5 border border-line px-3.5 py-2.5"
            style={{
              gridTemplateColumns: "32px 1fr auto",
              borderLeft: `2px solid ${ACCENT[kind]}`,
              backgroundColor:
                kind === "active" ? "rgba(232,176,74,0.08)" : "transparent",
              borderColor:
                kind === "active" ? "rgba(232,176,74,0.33)" : "var(--cn-line)",
            }}
          >
            <span
              className="text-center font-serif text-lg italic"
              style={{
                color:
                  kind === "active"
                    ? "var(--cn-amber)"
                    : "var(--cn-text-faint)",
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>

            <span className="text-[14.5px]">
              {guess && !guess.skipped ? (
                <span className="text-cn-text">
                  {guess.title}
                  {guess.year && (
                    <span className="ml-2 text-cn-dim">({guess.year})</span>
                  )}
                </span>
              ) : guess?.skipped ? (
                <span className="text-cn-dim italic">Skipped this turn</span>
              ) : isActive ? (
                <span className="text-[13px] tracking-[0.06em] text-amber">
                  Your turn —
                </span>
              ) : (
                <span className="tracking-[0.04em] text-cn-faint">—</span>
              )}
            </span>

            <span
              className={`text-[10px] uppercase tracking-[0.18em] ${STATUS_COLOR[kind]}`}
            >
              {STATUS_LABEL[kind]}
            </span>
          </div>
        );
      })}
    </div>
  );
};
