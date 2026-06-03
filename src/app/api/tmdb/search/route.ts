import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const TMDB_API_BASE = "https://api.themoviedb.org/3";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query");

  if (!query || !query.trim()) {
    return NextResponse.json({ results: [] }, { status: 200 });
  }

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TMDB API key not configured" },
      { status: 500 },
    );
  }

  try {
    // Fetch multiple pages for broader results
    interface TMDBMovie {
      id: number;
      poster_path: string | null;
      popularity?: number;
      [key: string]: unknown;
    }
    const allResults: TMDBMovie[] = [];
    const maxPages = 3; // Fetch up to 3 pages for broader results

    // Get today's date in YYYY-MM-DD format for filtering
    const today = new Date();
    const todayString = today.toISOString().split("T")[0];

    for (let page = 1; page <= maxPages; page++) {
      const url = new URL(`${TMDB_API_BASE}/search/movie`);
      url.searchParams.set("query", query);
      url.searchParams.set("page", page.toString());
      // Filter to only include movies released on or before today
      url.searchParams.set("primary_release_date.lte", todayString);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (page === 1) {
          const errorText = await response.text();
          console.error("TMDB API error:", response.status, errorText);
          return NextResponse.json(
            { error: `TMDB API error: ${response.status}` },
            { status: response.status },
          );
        }
        // If later pages fail, continue with what we have
        break;
      }

      const data = await response.json();
      // Filter to only return movies with posters, valid IDs, and that have been released
      // (Client-side filter as backup, since search endpoint may not support date filtering)
      const todayForComparison = new Date();
      todayForComparison.setHours(0, 0, 0, 0); // Set to start of day for comparison

      const pageResults = data.results.filter(
        (movie: {
          id: number;
          poster_path: string | null;
          release_date?: string;
        }) => {
          if (!movie.poster_path || !movie.id) {
            return false;
          }
          // Only include movies that have been released (release_date exists and is today or in the past)
          if (!movie.release_date) {
            return false;
          }
          const releaseDate = new Date(movie.release_date);
          releaseDate.setHours(0, 0, 0, 0);
          return releaseDate <= todayForComparison;
        },
      ) as TMDBMovie[];
      allResults.push(...pageResults);

      // Stop if we've reached the last page
      if (page >= data.total_pages) {
        break;
      }
    }

    // Remove duplicates by movie ID
    const uniqueMovies = new Map<number, TMDBMovie>();
    for (const movie of allResults) {
      if (!uniqueMovies.has(movie.id)) {
        uniqueMovies.set(movie.id, movie);
      }
    }

    // Convert back to array and sort by popularity (highest first)
    const sortedResults = Array.from(uniqueMovies.values()).sort((a, b) => {
      const popularityA = a.popularity ?? 0;
      const popularityB = b.popularity ?? 0;
      return popularityB - popularityA;
    });

    return NextResponse.json({ results: sortedResults });
  } catch (error) {
    console.error("Error searching movies:", error);
    return NextResponse.json(
      { error: "Failed to search movies" },
      { status: 500 },
    );
  }
}
