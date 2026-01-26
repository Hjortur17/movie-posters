"use client";

import { useState, useEffect } from "react";
import { getUserScores } from "@/lib/scores";
import { getAnonymousId } from "@/lib/user";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

interface UserStatsProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Stats {
  totalGames: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  winsByGuess: {
    guess1: number;
    guess2: number;
    guess3: number;
    guess4: number;
    guess5: number;
  };
  averageScore: number;
  bestScore: number;
  totalScore: number;
}

export const UserStats = ({ isOpen, onOpenChange }: UserStatsProps) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const anonymousId = getAnonymousId();
        const scores = await getUserScores(anonymousId);

        const stats: Stats = {
          totalGames: scores.length,
          gamesWon: scores.filter((s) => s.guess_number > 0).length,
          gamesLost: scores.filter((s) => s.guess_number === 0).length,
          winRate: 0,
          winsByGuess: {
            guess1: scores.filter((s) => s.guess_number === 1).length,
            guess2: scores.filter((s) => s.guess_number === 2).length,
            guess3: scores.filter((s) => s.guess_number === 3).length,
            guess4: scores.filter((s) => s.guess_number === 4).length,
            guess5: scores.filter((s) => s.guess_number === 5).length,
          },
          averageScore: 0,
          bestScore: 0,
          totalScore: 0,
        };

        if (stats.totalGames > 0) {
          stats.winRate = (stats.gamesWon / stats.totalGames) * 100;
          stats.totalScore = scores.reduce((sum, s) => sum + s.score, 0);
          stats.averageScore = stats.totalScore / stats.totalGames;
          stats.bestScore = Math.max(...scores.map((s) => s.score));
        }

        setStats(stats);
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            📊 Your Statistics
          </DialogTitle>
          <DialogDescription>
            View your performance history and achievements
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="py-8 text-center">
            <div className="text-gray-500">Loading statistics...</div>
          </div>
        )}

        {error && (
          <div className="py-8 text-center">
            <div className="text-red-600 mb-2">Error loading statistics</div>
            <div className="text-sm text-gray-600">{error}</div>
          </div>
        )}

        {!isLoading && !error && stats && (
          <div className="space-y-6 py-4">
            {/* Overall Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalGames}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total Games</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.gamesWon}
                </div>
                <div className="text-sm text-gray-600 mt-1">Games Won</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">
                  {stats.gamesLost}
                </div>
                <div className="text-sm text-gray-600 mt-1">Games Lost</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.winRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 mt-1">Win Rate</div>
              </div>
            </div>

            {/* Score Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-yellow-50 p-4 rounded-lg text-center">
                <div className="text-xl font-bold text-yellow-600">
                  {stats.bestScore}
                </div>
                <div className="text-sm text-gray-600 mt-1">Best Score</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg text-center">
                <div className="text-xl font-bold text-orange-600">
                  {stats.averageScore.toFixed(0)}
                </div>
                <div className="text-sm text-gray-600 mt-1">Avg Score</div>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg text-center">
                <div className="text-xl font-bold text-indigo-600">
                  {stats.totalScore}
                </div>
                <div className="text-sm text-gray-600 mt-1">Total Score</div>
              </div>
            </div>

            {/* Wins by Guess Number */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-bold mb-4 text-center">
                Wins by Guess Number
              </h3>
              <div className="space-y-3">
                {[
                  {
                    label: "1st Guess",
                    count: stats.winsByGuess.guess1,
                    emoji: "🎯",
                  },
                  {
                    label: "2nd Guess",
                    count: stats.winsByGuess.guess2,
                    emoji: "🔥",
                  },
                  {
                    label: "3rd Guess",
                    count: stats.winsByGuess.guess3,
                    emoji: "⭐",
                  },
                  {
                    label: "4th Guess",
                    count: stats.winsByGuess.guess4,
                    emoji: "💪",
                  },
                  {
                    label: "5th Guess",
                    count: stats.winsByGuess.guess5,
                    emoji: "🎉",
                  },
                ].map((item) => {
                  const percentage =
                    stats.gamesWon > 0
                      ? (item.count / stats.gamesWon) * 100
                      : 0;
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium">
                          {item.emoji} {item.label}
                        </span>
                        <span className="text-gray-600">
                          {item.count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {stats.totalGames === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg mb-2">No games played yet!</p>
                <p className="text-sm">
                  Complete your first game to see your statistics here.
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
