"use client"

import { useState } from "react"
import type { GameState } from "@/lib/game"
import type { Movie } from "@/lib/tmdb"
import { checkGuess } from "@/lib/game"

interface ShareButtonProps {
  gameState: GameState
  correctMovie: Movie
}

export const ShareButton = ({ gameState, correctMovie }: ShareButtonProps) => {
  const [copied, setCopied] = useState(false)

  const generateShareText = (): string => {
    const gameId = gameState.gameId
    // Extract day number from game ID (YYYY-MM-DD format)
    // Calculate a consistent day number from the date
    const dateParts = gameId.split("-")
    const dayNumber = parseInt(dateParts[0] + dateParts[1] + dateParts[2], 10) % 10000

    // Generate emoji grid: 🟥 = wrong, 🟩 = correct, ⬛ = not attempted
    const emojis: string[] = []
    for (let i = 0; i < 5; i++) {
      if (i < gameState.guesses.length) {
        // Check if this specific guess was correct
        const guess = gameState.guesses[i]
        // Use movie ID for accurate comparison, fallback to title check for old guesses
        const isCorrect = guess.movieId 
          ? guess.movieId === correctMovie.id 
          : (typeof guess === "string" 
            ? guess.toLowerCase().trim() === correctMovie.title.toLowerCase().trim()
            : guess.title.toLowerCase().trim() === correctMovie.title.toLowerCase().trim())
        emojis.push(isCorrect ? "🟩" : "🟥")
      } else {
        emojis.push("⬛")
      }
    }

    const emojiGrid = emojis.join("")
    const scoreText = gameState.won ? `🎉 ${gameState.currentGuess}/5` : "❌ 0/5"

    return `#CoverQuest #${dayNumber}\n${emojiGrid} ${scoreText}\nhttps://coverquest.jbonet.xyz`
  }

  const handleShare = async () => {
    const shareText = generateShareText()

    try {
      if (navigator.share) {
        await navigator.share({
          text: shareText,
        })
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (error) {
      // If sharing fails, try clipboard
      try {
        await navigator.clipboard.writeText(shareText)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (clipboardError) {
        console.error("Failed to copy to clipboard:", clipboardError)
      }
    }
  }

  if (!gameState.isComplete) {
    return null
  }

  return (
    <button
      onClick={handleShare}
      className="px-6 py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors"
    >
      {copied ? "Copied!" : "Share Score"}
    </button>
  )
}
