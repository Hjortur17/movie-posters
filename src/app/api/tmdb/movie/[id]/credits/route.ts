import { NextRequest, NextResponse } from "next/server";

const TMDB_API_BASE = "https://api.themoviedb.org/3";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const movieId = parseInt(id, 10);

  if (isNaN(movieId)) {
    return NextResponse.json({ error: "Invalid movie ID" }, { status: 400 });
  }

  const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TMDB API key not configured" },
      { status: 500 }
    );
  }

  try {
    const url = `${TMDB_API_BASE}/movie/${movieId}/credits`;
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
        { status: response.status }
      );
    }

    const credits = await response.json();
    // Find director (job === "Director")
    const director = credits.crew?.find(
      (person: { job: string }) => person.job === "Director"
    );

    return NextResponse.json({
      director_id: director?.id || null,
    });
  } catch (error) {
    console.error("Error fetching movie credits:", error);
    return NextResponse.json(
      { error: "Failed to fetch movie credits" },
      { status: 500 }
    );
  }
}
