import { GameBoard } from "@/components/GameBoard";

export default function Home() {
  return (
    <div className="flex min-h-screen items-start justify-center font-sans px-4 py-8">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl mb-2 font-black tracking-tight uppercase">
            PosterQuest
          </h1>
          <p className="text-gray-600">
            Guess the movie from the pixelated poster. You get 5 guesses, and
            the image gets clearer with each one!
          </p>
        </div>

        <GameBoard />
      </div>
    </div>
  );
}
