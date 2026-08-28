"use client";

import { useEffect, useState } from "react";
import { pixelateImage } from "@/lib/pixelate";

interface MoviePosterProps {
  imageUrl: string | null;
  pixelationLevel: number;
  alt?: string;
  guessNumber?: number; // 1-based current guess, for the caption row
  livesLeft?: number; // hearts shown in the frame header
}

export const MoviePoster = ({
  imageUrl,
  pixelationLevel,
  alt = "Movie poster",
  guessNumber,
  livesLeft = 5,
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

  const revealed = pixelationLevel === 0;
  const zoomLabel = revealed ? "REVEALED" : `${pixelationLevel}% PIXELATED`;
  const guessLabel = revealed
    ? "FULL POSTER"
    : `GUESS ${Math.min(guessNumber ?? 1, 5)} / 5`;

  return (
    <div
      className="relative mx-auto w-full max-w-[210px] border-4 border-pq-line bg-pq-panel p-3.5 sm:max-w-[240px] lg:max-w-[min(100%,calc(30vh+40px))]"
      style={{ boxShadow: "12px 12px 0 rgba(0,0,0,0.6)" }}
    >
      {/* Frame header: filename + remaining lives */}
      <div className="mb-3 flex items-center justify-between gap-2 whitespace-nowrap font-press text-[7px] tracking-[1px] text-pq-muted sm:text-[8px]">
        <span>POSTER.JPG</span>
        <span className="flex items-center gap-[3px]">
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={`heart-${i}`}
              className="size-3 sm:size-3.75"
              style={{
                backgroundColor:
                  i < livesLeft ? "var(--pq-red)" : "var(--pq-locked)",
                maskImage: "url(/heart.svg)",
                WebkitMaskImage: "url(/heart.svg)",
                maskSize: "contain",
                WebkitMaskSize: "contain",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskPosition: "center",
              }}
            />
          ))}
        </span>
      </div>

      <div className="relative aspect-[2/3] w-full overflow-hidden bg-pq-bg">
        {showPlaceholder ? (
          <div className="pq-loading flex h-full w-full items-center justify-center">
            <span className="font-press text-[8px] tracking-[1px] text-pq-faint">
              {!imageUrl ? "NO POSTER" : "LOADING…"}
            </span>
          </div>
        ) : (
          <>
            {/** biome-ignore lint/performance/noImgElement: pixelated data URL */}
            <img
              src={imageSrc}
              alt={alt}
              className="h-full w-full object-cover"
              style={{ imageRendering: revealed ? "auto" : "pixelated" }}
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

      {/* Frame footer: how blocky it is right now + which guess we're on */}
      <div className="mt-3 flex items-center justify-between gap-2 whitespace-nowrap font-press text-[7px] tracking-[1px] text-pq-muted sm:text-[8px]">
        <span>{zoomLabel}</span>
        <span className="text-pq-amber">{guessLabel}</span>
      </div>
    </div>
  );
};
