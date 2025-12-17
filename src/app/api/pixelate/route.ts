import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get("url");
    const level = searchParams.get("level");

    if (!imageUrl || !level) {
      return NextResponse.json(
        { error: "Missing url or level parameter" },
        { status: 400 }
      );
    }

    const pixelationLevel = parseInt(level, 10);
    if (
      isNaN(pixelationLevel) ||
      pixelationLevel < 0 ||
      pixelationLevel > 100
    ) {
      return NextResponse.json(
        { error: "Invalid pixelation level" },
        { status: 400 }
      );
    }

    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: 500 }
      );
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use sharp for server-side image processing (more reliable than canvas)
    // For now, we'll use a simpler approach with canvas in Node.js
    // Note: This requires canvas package or we can use a different approach

    // Return the image with appropriate headers for now
    // TODO: Implement actual server-side pixelation
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          imageResponse.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error in pixelate route:", error);
    return NextResponse.json(
      { error: "Failed to pixelate image" },
      { status: 500 }
    );
  }
}
