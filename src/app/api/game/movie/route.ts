import { NextRequest, NextResponse } from "next/server";
import { redis, getMovieKey } from "@/lib/redis";
import { getDailyGameId } from "@/lib/game";

// Only return movie details when game is complete
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gameId = searchParams.get("gameId");
    const isComplete = searchParams.get("isComplete") === "true";

    if (!gameId) {
      return NextResponse.json({ error: "Missing gameId" }, { status: 400 });
    }

    // Verify gameId matches today's game
    const today = new Date();
    const todayGameId = getDailyGameId(today);
    if (gameId !== todayGameId) {
      return NextResponse.json({ error: "Invalid gameId" }, { status: 400 });
    }

    // Only return movie details if game is complete
    if (!isComplete) {
      return NextResponse.json({ error: "Game not complete" }, { status: 403 });
    }

    const movieKey = getMovieKey(gameId);
    const movie = await redis.get(movieKey);

    if (!movie) {
      return NextResponse.json({ error: "Movie not found" }, { status: 404 });
    }

    return NextResponse.json(movie);
  } catch (error) {
    console.error("Error getting movie:", error);
    return NextResponse.json({ error: "Failed to get movie" }, { status: 500 });
  }
}
