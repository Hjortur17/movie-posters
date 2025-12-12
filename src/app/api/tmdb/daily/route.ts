import { NextRequest, NextResponse } from "next/server";

const TMDB_API_BASE = "https://api.themoviedb.org/3";

// Simple seeded random number generator
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const dateString =
    searchParams.get("date") || new Date().toISOString().split("T")[0];
  const forceNew = searchParams.get("forceNew") === "true"; // For development

  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TMDB API key not configured" },
      { status: 500 }
    );
  }

  try {
    // Create a seed from the date (YYYY-MM-DD format)
    const [year, month, day] = dateString.split("-").map(Number);
    let seed = year * 10000 + month * 100 + day;

    // In development mode or when forceNew is true, add timestamp for randomness
    if (process.env.NODE_ENV === "development" || forceNew) {
      // Use current timestamp to get different movies each time
      const timestamp = Date.now();
      seed = seed + (timestamp % 1000000);
    }

    const allMovies: any[] = [];

    // Fetch blockbuster movies using discover endpoint with filters
    // Filters: vote_count >= 1000 (popular/blockbuster), sort by popularity
    // Also filter for movies released in the last 30 years for relevance
    const currentYear = new Date().getFullYear();
    const minReleaseYear = currentYear - 50;

    // Fetch first 3 pages of blockbuster movies for better variety
    for (let page = 1; page <= 3; page++) {
      try {
        const url = new URL(`${TMDB_API_BASE}/discover/movie`);
        url.searchParams.set("sort_by", "popularity.desc");
        url.searchParams.set("vote_count.gte", "600"); // At least 600 votes = blockbuster
        url.searchParams.set("vote_average.gte", "4.5"); // At least 6.0 rating
        url.searchParams.set(
          "primary_release_date.gte",
          `${minReleaseYear}-01-01`
        );
        url.searchParams.set("page", page.toString());

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
              { status: response.status }
            );
          }
          // If later pages fail, continue with what we have
          break;
        }

        const data = await response.json();
        allMovies.push(...data.results);
      } catch (error) {
        if (page === 1) {
          console.error("Error fetching blockbuster movies:", error);
          return NextResponse.json(
            { error: "Failed to fetch blockbuster movies" },
            { status: 500 }
          );
        }
        // Continue with movies from previous pages
        break;
      }
    }

    // Filter movies with posters
    const moviesWithPosters = allMovies.filter((movie) => movie.poster_path);

    if (moviesWithPosters.length === 0) {
      return NextResponse.json(
        { error: "No movies with posters found" },
        { status: 500 }
      );
    }

    // Use seeded random to pick a movie (deterministic based on date)
    const randomIndex = Math.floor(
      seededRandom(seed) * moviesWithPosters.length
    );
    const selectedMovie = moviesWithPosters[randomIndex];

    // Get full movie details
    const movieUrl = `${TMDB_API_BASE}/movie/${selectedMovie.id}`;
    const movieResponse = await fetch(movieUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!movieResponse.ok) {
      const errorText = await movieResponse.text();
      console.error("TMDB API error:", movieResponse.status, errorText);
      return NextResponse.json(
        { error: `TMDB API error: ${movieResponse.status}` },
        { status: movieResponse.status }
      );
    }

    const movie = await movieResponse.json();
    return NextResponse.json(movie);
  } catch (error) {
    console.error("Error fetching daily movie:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily movie" },
      { status: 500 }
    );
  }
}
