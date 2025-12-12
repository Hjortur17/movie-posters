const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export interface Movie {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  overview?: string;
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
  } | null;
  genres?: Array<{ id: number; name: string }>;
  production_companies?: Array<{ id: number; name: string }>;
  director_id?: number; // Will be populated from credits
}

export interface MovieSearchResult {
  id: number;
  title: string;
  release_date?: string;
  poster_path?: string | null;
  belongs_to_collection?: {
    id: number;
    name: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
  } | null;
}

export async function searchMovies(
  query: string
): Promise<MovieSearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const response = await fetch(
      `/api/tmdb/search?query=${encodeURIComponent(query)}`
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `API error: ${response.status}`);
    }
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("Error searching movies:", error);
    throw error;
  }
}

export async function getMovieDetails(movieId: number): Promise<Movie> {
  try {
    const [movieResponse, creditsResponse] = await Promise.all([
      fetch(`/api/tmdb/movie/${movieId}`),
      fetch(`/api/tmdb/movie/${movieId}/credits`).catch(() => null), // Credits are optional
    ]);

    if (!movieResponse.ok) {
      const error = await movieResponse.json();
      throw new Error(error.error || `API error: ${movieResponse.status}`);
    }

    const movie: Movie = await movieResponse.json();

    // Add director ID from credits if available
    if (creditsResponse?.ok) {
      const credits = await creditsResponse.json();
      movie.director_id = credits.director_id || undefined;
    }

    return movie;
  } catch (error) {
    console.error("Error fetching movie details:", error);
    throw error;
  }
}

export function getPosterUrl(
  posterPath: string | null | undefined
): string | null {
  if (!posterPath) {
    return null;
  }
  return `${TMDB_IMAGE_BASE}${posterPath}`;
}

// Get a deterministic daily movie based on date
export async function getDailyMovie(
  date: Date,
  forceNew = false
): Promise<Movie> {
  // Create a date string in YYYY-MM-DD format
  const dateString = date.toISOString().split("T")[0];

  // Add forceNew parameter if requested (for development)
  const forceParam = forceNew ? "&forceNew=true" : "";

  try {
    const response = await fetch(
      `/api/tmdb/daily?date=${dateString}${forceParam}`
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `API error: ${response.status}`);
    }
    const movie: Movie = await response.json();
    return movie;
  } catch (error) {
    console.error("Error fetching daily movie:", error);
    throw error;
  }
}
