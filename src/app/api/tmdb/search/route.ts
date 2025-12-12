import { NextRequest, NextResponse } from "next/server";

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
    const url = `${TMDB_API_BASE}/search/movie?query=${encodeURIComponent(
      query,
    )}&page=1`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("TMDB API error:", response.status, errorText);
      return NextResponse.json(
        { error: `TMDB API error: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    // Filter to only return movies with posters
    const results = data.results.filter(
      (movie: { poster_path: string | null }) => movie.poster_path,
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error searching movies:", error);
    return NextResponse.json(
      { error: "Failed to search movies" },
      { status: 500 },
    );
  }
}
