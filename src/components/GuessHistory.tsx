"use client"

import type { GameState } from "@/lib/game"
import type { Movie } from "@/lib/tmdb"
import { areMoviesRelated } from "@/lib/game"

interface GuessHistoryProps {
  gameState: GameState
  correctMovie: Movie
}

export const GuessHistory = ({ gameState, correctMovie }: GuessHistoryProps) => {
  if (gameState.guesses.length === 0) {
    return null
  }

  return (
    <div className="mt-6 space-y-2">
      <h3 className="text-lg font-semibold mb-3">Your Guesses</h3>
      {gameState.guesses.map((guess, index) => {
        // Use movie ID for accurate comparison, fallback to title check for old guesses without movieId
        const isCorrect = guess.movieId 
          ? guess.movieId === correctMovie.id 
          : guess.title.toLowerCase().trim() === correctMovie.title.toLowerCase().trim()
        
        // Check if movies are related (same franchise, director, genres, or production company)
        const isRelated = !isCorrect && areMoviesRelated(guess, correctMovie)
        
        // Determine styling: green for correct, yellow for related, red for wrong
        let bgClass = "bg-red-50 border-red-200 text-red-900"
        let statusText = null
        
        if (isCorrect) {
          bgClass = "bg-green-50 border-green-200 text-green-900"
          statusText = <span className="ml-auto text-green-600 font-bold">✓ Correct!</span>
        } else if (isRelated) {
          bgClass = "bg-yellow-50 border-yellow-200 text-yellow-900"
          statusText = <span className="ml-auto text-yellow-600 font-bold">🔗 Related!</span>
        }
        
        // Create unique key using movieId if available, otherwise use title + index
        const uniqueKey = guess.movieId 
          ? `guess-${guess.movieId}-${index}` 
          : `guess-${guess.title}-${index}`
        
        return (
          <div
            key={uniqueKey}
            className={`p-3 rounded-md border ${bgClass}`}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{index + 1}.</span>
              <span>
                {guess.title}
                {guess.year && <span className="text-gray-600"> ({guess.year})</span>}
              </span>
              {statusText}
            </div>
          </div>
        )
      })}
    </div>
  )
}
