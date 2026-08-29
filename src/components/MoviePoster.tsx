"use client";

import { useEffect, useState } from "react";
import { pixelateImage } from "@/lib/pixelate";
import { cn } from "@/lib/utils";

interface MoviePosterProps {
  imageUrl: string | null;
  pixelationLevel: number;
  alt?: string;
  guessNumber?: number; // 1-based current guess, for the caption row
  livesLeft?: number; // hearts shown in the frame header
}

/**
 * Pixel heart, inlined rather than loaded from /public so it can be tinted with
 * a plain text-colour utility instead of a CSS mask.
 */
const HeartIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="M13 22h-2v-2h2v2Zm-2-2H9v-2h2v2Zm4 0h-2v-2h2v2Zm-6-2H7v-2h2v2Zm8 0h-2v-2h2v2ZM7 16H5v-2h2v2Zm12 0h-2v-2h2v2ZM5 14H3v-2h2v2Zm16 0h-2v-2h2v2ZM3 12H1V6h2v6Zm20 0h-2V6h2v6ZM13 8h-2V6h2v2ZM5 6H3V4h2v2Zm6 0H9V4h2v2Zm4 0h-2V4h2v2Zm6 0h-2V4h2v2ZM9 4H5V2h4v2Zm10 0h-4V2h4v2Z" />
  </svg>
);

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
    <div className="relative mx-auto w-full max-w-[210px] border-4 border-pq-line bg-pq-panel p-3.5 shadow-pq-frame sm:max-w-[240px] lg:max-w-[min(100%,calc(30vh+40px))]">
      {/* Frame header: filename + remaining lives */}
      <div className="mb-3 flex items-center justify-between gap-2 whitespace-nowrap font-press text-pq-muted text-press-2xs tracking-pq-1 sm:text-press-xs">
        <span>POSTER.JPG</span>
        <span className="flex items-center gap-[3px]">
          {Array.from({ length: 5 }, (_, i) => (
            <HeartIcon
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed 5 life slots, index is the heart identity
              key={`heart-${i}`}
              className={cn(
                "size-3 sm:size-3.75",
                i < livesLeft ? "text-pq-red" : "text-pq-locked",
              )}
            />
          ))}
        </span>
      </div>

      <div className="relative aspect-[2/3] w-full overflow-hidden bg-pq-bg">
        {showPlaceholder ? (
          <div className="pq-loading flex h-full w-full items-center justify-center">
            <span className="font-press text-pq-faint text-press-xs tracking-pq-1">
              {!imageUrl ? "NO POSTER" : "LOADING…"}
            </span>
          </div>
        ) : (
          <>
            {/** biome-ignore lint/performance/noImgElement: pixelated data URL */}
            <img
              src={imageSrc}
              alt={alt}
              className={cn(
                "h-full w-full object-cover",
                !revealed && "[image-rendering:pixelated]",
              )}
              loading="eager"
              fetchPriority="high"
              onError={() => {
                if (pixelationLevel > 0) setIsLoading(true);
              }}
            />
            {/* Safety overlay: additional blur protection in case pixelation fails */}
            {pixelationLevel > 0 && (
              <div className="pointer-events-none absolute inset-0 opacity-30 mix-blend-multiply backdrop-blur-[5px]" />
            )}
          </>
        )}
      </div>

      {/* Frame footer: how blocky it is right now + which guess we're on */}
      <div className="mt-3 flex items-center justify-between gap-2 whitespace-nowrap font-press text-pq-muted text-press-2xs tracking-pq-1 sm:text-press-xs">
        <span>{zoomLabel}</span>
        <span className="text-pq-amber">{guessLabel}</span>
      </div>
    </div>
  );
};
