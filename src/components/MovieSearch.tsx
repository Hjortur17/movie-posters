"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { type MovieSearchResult, searchMovies } from "@/lib/tmdb";

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
      <div className="flex h-[52px] items-center border border-line-strong bg-ink py-1 pl-[18px] pr-1 transition-colors focus-within:border-[rgba(232,176,74,0.35)] focus-within:ring-2 focus-within:ring-[rgba(232,176,74,0.4)]">
        <input
          ref={inputRef}
          placeholder="Type a movie title…"
          className="min-w-0 flex-1 border-none bg-transparent text-[15px] text-cn-text outline-none placeholder:text-cn-faint disabled:opacity-50"
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
          className="h-full cursor-pointer bg-amber px-[22px] text-[13px] font-semibold uppercase tracking-[0.14em] text-(--cn-bg) transition-colors hover:bg-amber-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "…" : "Guess"}
        </button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto border border-line-strong bg-ink shadow-lg"
        >
          {suggestions.map((movie, index) => (
            <button
              key={movie.id}
              type="button"
              className={`w-full border-b border-line px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[rgba(232,176,74,0.08)] focus:outline-none ${
                index === selectedIndex ? "bg-[rgba(232,176,74,0.08)]" : ""
              }`}
              onClick={() => handleSelect(movie)}
            >
              <div className="text-[14.5px] text-cn-text">{movie.title}</div>
              {movie.release_date && (
                <div className="text-xs text-cn-dim">
                  {new Date(movie.release_date).getFullYear()}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
