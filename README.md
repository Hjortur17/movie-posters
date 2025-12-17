# PosterQuest

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
TMDB_API_KEY=your_tmdb_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key
```

**Note:** You can also use `SUPABASE_URL` and `SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`) for backward compatibility.

**Note:** This project uses localStorage for game state persistence. Redis/KV storage is NOT used and should NOT be added.

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


### 3. Set Up Supabase Database

**Yes, you need to run the SQL script to create the database tables!**

Follow these steps:

1. **Open your Supabase project** at [https://supabase.com](https://supabase.com)
2. **Go to SQL Editor** (in the left sidebar)
3. **Click "New Query"** (or use the existing query editor)
4. **Copy the entire contents** of the `supabase-schema.sql` file in this project
5. **Paste it into the SQL Editor**
6. **Click "Run"** (or press `Ctrl/Cmd + Enter`)

This will create:
- ✅ `scores` table for storing game scores
- ✅ Indexes for better query performance
- ✅ Row Level Security (RLS) policies for data access
- ✅ A leaderboard function for querying top scores

**Important:** You only need to run this script **once** when setting up your project. After that, the tables will persist in your Supabase database.

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
   #PosterQuest #1053
   🟥🟩⬛⬛⬛ 🎉 2/5
   https://your-vercel-url.vercel.app
   ```

## Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **The Movie DB API** - Movie data and posters
- **Supabase** - Database and score tracking
- **Canvas API** - Pixelation effects

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Main page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
│   └── api/
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
    └── pixelate.ts       # Pixelation utilities
```
```

## License

MIT
