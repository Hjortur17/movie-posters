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

    // CRITICAL: Always pixelate, even if level is 0 (game complete)
    // Only show original when explicitly allowed (game complete)
    if (pixelationLevel === 0) {
      // Game is complete - safe to show original
      setPixelatedUrl(imageUrl);
      setIsLoading(false);
      return;
    }

    // CRITICAL: Always pixelate during gameplay - never show original
    setIsLoading(true);
    pixelateImage(imageUrl, pixelationLevel)
      .then((dataUrl) => {
        setPixelatedUrl(dataUrl);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error pixelating image:", error);
        // CRITICAL: Never fall back to original - keep loading state
        // Retry pixelation with maximum level as fallback
        pixelateImage(imageUrl, 80)
          .then((dataUrl) => {
            setPixelatedUrl(dataUrl);
            setIsLoading(false);
          })
          .catch((retryError) => {
            console.error("Retry pixelation failed:", retryError);
            // Keep loading - never show original
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
  if (pixelationLevel > 0 && !pixelatedUrl) {
    return (
      <div className="w-full aspect-[8/9] bg-gray-200 flex items-center justify-center rounded-lg">
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  // CRITICAL: Only use pixelated URL, never original if pixelation is required
  const imageSrc = pixelatedUrl || (pixelationLevel === 0 ? imageUrl : null);

  if (!imageSrc) {
    return (
      <div className="w-full aspect-[8/9] bg-gray-200 flex items-center justify-center rounded-lg">
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  return (
    <div className="w-full aspect-[8/9] max-h-[700px] rounded-lg overflow-hidden bg-transparent relative">
      <img
        src={imageSrc}
        alt={alt}
        className="w-full h-full object-contain"
        style={{
          imageRendering: pixelationLevel === 0 ? "auto" : "pixelated",
        }}
        loading="eager"
        fetchPriority="high"
        onError={() => {
          // If image fails to load and pixelation is required, keep loading state
          if (pixelationLevel > 0) {
            setIsLoading(true);
          }
        }}
      />
      {/* Safety overlay: Additional blur protection in case pixelation fails */}
      {pixelationLevel > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
            mixBlendMode: "multiply",
            opacity: 0.3,
          }}
        />
      )}
    </div>
  );
};
