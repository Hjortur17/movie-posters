import type { Score } from "./scores";

export interface DerivedStats {
  played: number;
  won: number;
  winRate: number; // 0–100
  avgGuesses: number; // mean guess_number over wins (0 if no wins)
  best: number | null; // fewest guesses to win, null if no wins
  currentStreak: number;
  longestStreak: number;
  // counts of wins at each guess slot (index 0 = guess 1 … index 4 = guess 5)
  winsByGuess: [number, number, number, number, number];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Parse a "YYYY-MM-DD" game_id into a UTC-midnight epoch (ms).
function gameIdToUTC(gameId: string): number | null {
  const m = gameId.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

// Compute current & longest streak from winning days (consecutive UTC calendar days).
// "Current" counts back from the most recent win, allowing it to be today or yesterday.
function computeStreaks(winDays: number[]): {
  current: number;
  longest: number;
} {
  if (winDays.length === 0) return { current: 0, longest: 0 };

  // Unique, sorted ascending
  const days = Array.from(new Set(winDays)).sort((a, b) => a - b);

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i] - days[i - 1] === MS_PER_DAY) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
  }

  // Current streak: walk backwards from the latest win day.
  let current = 1;
  for (let i = days.length - 1; i > 0; i--) {
    if (days[i] - days[i - 1] === MS_PER_DAY) {
      current += 1;
    } else {
      break;
    }
  }

  // If the latest win isn't today or yesterday, the streak is considered broken.
  const todayUTC = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate(),
  );
  const lastWin = days[days.length - 1];
  if (lastWin < todayUTC - MS_PER_DAY) {
    current = 0;
  }

  return { current, longest };
}

export function deriveStats(scores: Score[]): DerivedStats {
  const winsByGuess: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  const winDays: number[] = [];
  let won = 0;
  let guessSum = 0;
  let best: number | null = null;

  for (const s of scores) {
    if (s.guess_number > 0) {
      won += 1;
      guessSum += s.guess_number;
      if (best === null || s.guess_number < best) best = s.guess_number;
      const idx = s.guess_number - 1;
      if (idx >= 0 && idx < 5) winsByGuess[idx] += 1;
      const day = gameIdToUTC(s.game_id);
      if (day !== null) winDays.push(day);
    }
  }

  const played = scores.length;
  const { current, longest } = computeStreaks(winDays);

  return {
    played,
    won,
    winRate: played > 0 ? (won / played) * 100 : 0,
    avgGuesses: won > 0 ? guessSum / won : 0,
    best,
    currentStreak: current,
    longestStreak: longest,
    winsByGuess,
  };
}
