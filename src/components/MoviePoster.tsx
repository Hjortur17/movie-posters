"use client";

import { useEffect, useState } from "react";
import { pixelateImage } from "@/lib/pixelate";

interface MoviePosterProps {
  imageUrl: string | null;
  pixelationLevel: number;
  alt?: string;
  guessNumber?: number; // 1-based current guess, for the caption row
}

export const MoviePoster = ({
  imageUrl,
  pixelationLevel,
  alt = "Movie poster",
  guessNumber,
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

  // CRITICAL: Only use pixelated URL, never original if pixelation is required
  const imageSrc = pixelatedUrl || (pixelationLevel === 0 ? imageUrl : null);
  const showPlaceholder = !imageUrl || isLoading || !imageSrc;

  return (
    <div className="relative">
      {/* Amber spotlight glow behind the frame */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-[60px] -inset-y-10 rounded-full"
        style={{
          background:
            "radial-gradient(ellipse, rgba(232,176,74,0.10) 0%, transparent 60%)",
          filter: "blur(20px)",
        }}
      />

      {/* Frame */}
      <div
        className="relative border border-line-strong bg-ink p-1.5"
        style={{
          boxShadow:
            "0 30px 60px -20px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.03)",
        }}
      >
        <div className="relative h-[480px] w-[320px] max-w-full overflow-hidden bg-black">
          {showPlaceholder ? (
            <div className="cn-shimmer flex h-full w-full items-center justify-center">
              <span className="text-xs uppercase tracking-[0.14em] text-cn-faint">
                {!imageUrl ? "No poster" : "Developing…"}
              </span>
            </div>
          ) : (
            <>
              {/** biome-ignore lint/performance/noImgElement: pixelated data URL */}
              <img
                src={imageSrc}
                alt={alt}
                className="h-full w-full object-cover transition-opacity duration-300"
                style={{
                  imageRendering: pixelationLevel === 0 ? "auto" : "pixelated",
                }}
                loading="eager"
                fetchPriority="high"
                onError={() => {
                  if (pixelationLevel > 0) setIsLoading(true);
                }}
              />
              {/* Safety overlay: additional blur protection in case pixelation fails */}
              {pixelationLevel > 0 && (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backdropFilter: "blur(5px)",
                    WebkitBackdropFilter: "blur(5px)",
                    mixBlendMode: "multiply",
                    opacity: 0.3,
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* Caption row */}
        <div className="flex items-center justify-between px-1 pb-0.5 pt-2.5 text-[10px] uppercase tracking-[0.14em] text-cn-faint">
          <span>Now showing</span>
          <span>
            {guessNumber && pixelationLevel > 0
              ? `Guess ${Math.min(guessNumber, 5)} / 5`
              : "Revealed"}
          </span>
        </div>
      </div>
    </div>
  );
};
