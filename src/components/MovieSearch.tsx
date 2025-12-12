"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { searchMovies, type MovieSearchResult } from "@/lib/tmdb";

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
        setSuggestions(results.slice(0, 5)); // Limit to 5 suggestions
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
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSelect(suggestions[selectedIndex]);
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

  return (
    <div className="relative w-full">
      <InputGroup className="bg-white h-16">
        <InputGroupInput
          ref={inputRef}
          placeholder="Type to search..."
          className="text-lg!"
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
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            variant="dark"
            className="h-full text-base px-6 uppercase font-black"
            disabled={disabled || isLoading}
          >
            {isLoading ? "..." : "Search"}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((movie, index) => (
            <button
              key={movie.id}
              type="button"
              className={`w-full text-left px-4 py-3 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                index === selectedIndex ? "bg-gray-100" : ""
              }`}
              onClick={() => handleSelect(movie)}
            >
              <div className="font-medium">{movie.title}</div>
              {movie.release_date && (
                <div className="text-sm text-gray-500">
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
