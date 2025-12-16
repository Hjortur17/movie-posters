"use client";

import { useEffect, useState } from "react";
import { pixelateImage } from "@/lib/pixelate";

interface MoviePosterProps {
  imageUrl: string | null;
  pixelationLevel: number;
  alt?: string;
}

export const MoviePoster = ({
  imageUrl,
  pixelationLevel,
  alt = "Movie poster",
}: MoviePosterProps) => {
  const [pixelatedUrl, setPixelatedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!imageUrl) {
      setPixelatedUrl(null);
      setIsLoading(false);
      return;
    }

    // If pixelation level is 0, show the original image directly
    if (pixelationLevel === 0) {
      setPixelatedUrl(imageUrl);
      setIsLoading(false);
      return;
    }

    // Always pixelate the image - never show original as fallback
    setIsLoading(true);
    pixelateImage(imageUrl, pixelationLevel)
      .then((dataUrl) => {
        setPixelatedUrl(dataUrl);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error pixelating image:", error);
        // Retry pixelation with a higher level to ensure it works
        // Use maximum pixelation as fallback to prevent showing original
        pixelateImage(imageUrl, 80)
          .then((dataUrl) => {
            setPixelatedUrl(dataUrl);
            setIsLoading(false);
          })
          .catch((retryError) => {
            console.error("Retry pixelation also failed:", retryError);
            // Last resort: create a heavily pixelated version
            // This should never fail, but if it does, show loading state
            setIsLoading(true);
          });
      });
  }, [imageUrl, pixelationLevel]);

  if (!imageUrl) {
    return (
      <div className="w-full aspect-[8/9] bg-gray-200 flex items-center justify-center rounded-lg">
        <span className="text-gray-400">No poster available</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full aspect-[8/9] bg-gray-200 flex items-center justify-center rounded-lg">
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  // CRITICAL: Never show original image if pixelation is required
  // Only show pixelated version or loading state
  if (!pixelatedUrl && pixelationLevel > 0) {
    return (
      <div className="w-full aspect-[8/9] bg-gray-200 flex items-center justify-center rounded-lg">
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  return (
    <div className="w-full aspect-[8/9] max-h-[700px] rounded-lg overflow-hidden bg-transparent">
      <img
        src={pixelatedUrl || imageUrl}
        alt={alt}
        className="w-full h-full object-contain"
        style={{ imageRendering: pixelationLevel === 0 ? "auto" : "pixelated" }}
        loading="eager"
        fetchPriority="high"
      />
    </div>
  );
};
