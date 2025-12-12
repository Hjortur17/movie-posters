import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "",
  token:
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export { redis };

// Game state keys
export function getGameStateKey(anonymousId: string, gameId: string): string {
  return `game:${anonymousId}:${gameId}`;
}

// Movie data keys (stored separately, never sent to client)
export function getMovieKey(gameId: string): string {
  return `movie:${gameId}`;
}

// Poster URL key (safe to send to client)
export function getPosterUrlKey(gameId: string): string {
  return `poster:${gameId}`;
}
