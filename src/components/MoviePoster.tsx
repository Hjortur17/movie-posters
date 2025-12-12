"use client"

import { useEffect, useState, useRef } from "react"
import { pixelateImage } from "@/lib/pixelate"

interface MoviePosterProps {
  imageUrl: string | null
  pixelationLevel: number
  alt?: string
}

export const MoviePoster = ({
  imageUrl,
  pixelationLevel,
  alt = "Movie poster",
}: MoviePosterProps) => {
  const [pixelatedUrl, setPixelatedUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!imageUrl) {
      setPixelatedUrl(null)
      setIsLoading(false)
      return
    }

    // If pixelation level is 0, show the original image directly
    if (pixelationLevel === 0) {
      setPixelatedUrl(imageUrl)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    pixelateImage(imageUrl, pixelationLevel)
      .then((dataUrl) => {
        setPixelatedUrl(dataUrl)
        setIsLoading(false)
      })
      .catch((error) => {
        console.error("Error pixelating image:", error)
        setPixelatedUrl(imageUrl)
        setIsLoading(false)
      })
  }, [imageUrl, pixelationLevel])

  if (!imageUrl) {
    return (
      <div className="w-full aspect-[8/9] bg-gray-200 flex items-center justify-center rounded-lg">
        <span className="text-gray-400">No poster available</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="w-full aspect-[8/9] bg-gray-200 flex items-center justify-center rounded-lg">
        <span className="text-gray-400">Loading...</span>
      </div>
    )
  }

  return (
    <div className="w-full aspect-[8/9] max-h-[700px] rounded-lg overflow-hidden bg-transparent">
      <img
        src={pixelatedUrl || imageUrl}
        alt={alt}
        className="w-full h-full object-contain"
        style={{ imageRendering: pixelationLevel === 0 ? "auto" : "pixelated" }}
      />
    </div>
  )
}
