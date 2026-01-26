"use client";

import { useState, useEffect } from "react";
import type { GameState } from "@/lib/game";
import type { Movie } from "@/lib/tmdb";
import { ShareButton } from "./ShareButton";
import { UserStats } from "./UserStats";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

interface ScoreDisplayProps {
  gameState: GameState;
  correctMovie: Movie;
}

export const ScoreDisplay = ({
  gameState,
  correctMovie,
}: ScoreDisplayProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  useEffect(() => {
    if (gameState.isComplete && gameState.won) {
      setIsOpen(true);
    }
  }, [gameState.isComplete, gameState.won]);

  if (!gameState.isComplete) {
    return null;
  }

  return (
    <>
      {gameState.won ? (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="text-center">
            <DialogHeader>
              <DialogTitle className="text-3xl font-bold">
                🎉 You Got It!
              </DialogTitle>
              <DialogDescription className="text-lg">
                You guessed it in <strong>{gameState.currentGuess}</strong>{" "}
                tries!
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-lg mb-2">
                <strong>{correctMovie.title}</strong>
                {correctMovie.release_date && (
                  <span className="text-gray-600 ml-2">
                    ({new Date(correctMovie.release_date).getFullYear()})
                  </span>
                )}
              </p>
              <p className="text-lg mb-4">Score: {gameState.score} points</p>
            </div>
            <div className="flex justify-center gap-3">
              <ShareButton gameState={gameState} correctMovie={correctMovie} />
              <button
                type="button"
                onClick={() => setStatsOpen(true)}
                className="px-6 py-3 bg-gray-600 text-white rounded-md font-semibold hover:bg-gray-700 transition-colors"
              >
                📊 View Stats
              </button>
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <div className="mt-6 p-6 bg-gray-50 rounded-lg border">
          <h3 className="text-xl font-bold mb-4">❌ Game Over</h3>
          <p className="text-lg mb-4">Score: {gameState.score} points</p>
          <div className="flex justify-center gap-3">
            <ShareButton gameState={gameState} correctMovie={correctMovie} />
            <button
              type="button"
              onClick={() => setStatsOpen(true)}
              className="px-6 py-3 bg-gray-600 text-white rounded-md font-semibold hover:bg-gray-700 transition-colors"
            >
              📊 View Stats
            </button>
          </div>
        </div>
      )}

      <UserStats isOpen={statsOpen} onOpenChange={setStatsOpen} />
    </>
  );
};
