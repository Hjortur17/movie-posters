# CoverQuest

A daily movie guessing game where you try to identify a movie from a progressively clearer pixelated poster. You get 5 guesses, and the image gets clearer with each one!

## Features

- 🎬 Daily movie challenge (same movie for everyone each day)
- 🖼️ Progressive pixelation (80% → 60% → 40% → 20% → 0%)
- 🔍 Movie search with autocomplete from The Movie DB
- 📊 Score tracking with Supabase
- 📱 Shareable score format with emoji grid
- 👤 Anonymous user tracking

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_TMDB_API_KEY=your_tmdb_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
KV_REST_API_URL=your_redis_rest_api_url
KV_REST_API_TOKEN=your_redis_rest_api_token
```

Or if using Upstash directly:
```env
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
```

#### Getting API Keys

**The Movie DB API:**
1. Go to [https://www.themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
2. Create an account or log in
3. Request an API key
4. Copy your API key to `.env.local`

**Supabase:**
1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → API
4. Copy your Project URL and anon/public key to `.env.local`

**Upstash Redis (or Vercel KV):**
1. Go to [https://upstash.com](https://upstash.com) or use Vercel KV
2. Create a new Redis database
3. Copy the REST API URL and REST API Token to `.env.local`
4. The code supports both `KV_REST_API_URL`/`KV_REST_API_TOKEN` (Vercel KV) and `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` (Upstash)

### 3. Set Up Supabase Database

Run the SQL script in `supabase-schema.sql` in your Supabase SQL Editor:

1. Open your Supabase project
2. Go to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the script

This will create:
- `scores` table for storing game scores
- Indexes for performance
- Row Level Security policies
- A leaderboard function

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How It Works

1. **Daily Movie Selection**: Each day, a movie is selected deterministically based on the UTC date, so everyone gets the same movie on the same day.

2. **Progressive Pixelation**: The movie poster starts at 80% pixelation and gets clearer with each guess:
   - Guess 1: 80% pixelated
   - Guess 2: 60% pixelated
   - Guess 3: 40% pixelated
   - Guess 4: 20% pixelated
   - Guess 5: 0% pixelated (fully clear)

3. **Scoring**: 
   - Guess 1: 100 points
   - Guess 2: 80 points
   - Guess 3: 60 points
   - Guess 4: 40 points
   - Guess 5: 20 points
   - Failed: 0 points

4. **Sharing**: After completing a game, you can share your score with an emoji grid showing your guesses:
   ```
   #CoverQuest #1053
   🟥🟩⬛⬛⬛ 🎉 2/5
   https://coverquest.jbonet.xyz
   ```

## Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **The Movie DB API** - Movie data and posters
- **Supabase** - Database and score tracking
- **Upstash Redis** - Server-side game state storage (prevents client-side cheating)
- **Canvas API** - Pixelation effects

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main page
│   ├── layout.tsx        # Root layout
│   ├── globals.css       # Global styles
│   └── api/
│       ├── game/         # Game state API routes (server-side)
│       └── tmdb/         # TMDB API proxy routes
├── components/
│   ├── GameBoard.tsx     # Main game component
│   ├── MovieSearch.tsx   # Search with autocomplete
│   ├── MoviePoster.tsx   # Pixelated poster display
│   ├── GuessHistory.tsx  # Display past guesses
│   ├── ScoreDisplay.tsx  # Score and share UI
│   └── ShareButton.tsx   # Share functionality
└── lib/
    ├── tmdb.ts           # The Movie DB API client
    ├── game.ts           # Game logic and state
    ├── supabase.ts       # Supabase client
    ├── scores.ts         # Score submission/retrieval
    ├── user.ts           # Anonymous user tracking
    ├── pixelate.ts       # Pixelation utilities
    └── redis.ts          # Vercel KV client
```
```

## License

MIT
