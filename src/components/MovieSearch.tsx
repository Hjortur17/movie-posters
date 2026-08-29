"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type MovieSearchResult, searchMovies } from "@/lib/tmdb";
import { cn } from "@/lib/utils";

interface MovieSearchProps {
  onSelect: (movie: MovieSearchResult) => void;
  disabled?: boolean;
}

export const MovieSearch = ({
  onSelect,
  disabled = false,
}: MovieSearchProps) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MovieSearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchMovies(query);
        setSuggestions(results.slice(0, 6)); // Show up to 6 suggestions
        setShowSuggestions(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error("Error searching movies:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleSelect = useCallback(
    (movie: MovieSearchResult) => {
      setQuery("");
      setSuggestions([]);
      setShowSuggestions(false);
      onSelect(movie);
    },
    [onSelect],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick =
        selectedIndex >= 0 ? suggestions[selectedIndex] : suggestions[0];
      if (pick) {
        handleSelect(pick);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const submitTopPick = () => {
    if (disabled) return;
    const pick =
      selectedIndex >= 0 ? suggestions[selectedIndex] : suggestions[0];
    if (pick) handleSelect(pick);
  };

  return (
    <div className="relative w-full">
      <div className="flex flex-wrap gap-3">
        <input
          ref={inputRef}
          type="text"
          placeholder="SEARCH A MOVIE TITLE..."
          className="min-w-[200px] flex-1 border-4 border-pq-line bg-pq-panel px-4 py-[clamp(6px,1.3vh,12px)] text-body-md text-pq-text tracking-pq-1 outline-none disabled:opacity-50 lg:text-fluid-xl"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={submitTopPick}
          disabled={disabled || isLoading || suggestions.length === 0}
          className="pq-btn pq-btn--primary px-[22px] py-[clamp(9px,1.7vh,16px)] text-press-lg"
        >
          {isLoading ? "…" : "▶ GUESS"}
        </button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          // Opens upward: the input sits low in the fixed-height board, so a
          // downward menu would be clipped by the footer.
          className="absolute bottom-full z-50 mb-1.5 max-h-60 w-full overflow-auto border-4 border-pq-line bg-pq-panel shadow-pq-menu"
        >
          {suggestions.map((movie, index) => (
            <button
              key={movie.id}
              type="button"
              className={cn(
                "block w-full cursor-pointer border-pq-line-dim border-b-2 px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-pq-active-bg",
                index === selectedIndex && "bg-pq-active-bg",
              )}
              onClick={() => handleSelect(movie)}
            >
              <span className="text-body-md text-pq-text tracking-pq-1">
                {movie.title.toUpperCase()}
              </span>
              {movie.release_date && (
                <span className="ml-2 text-body-xs text-pq-muted">
                  ({new Date(movie.release_date).getFullYear()})
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
