import Link from "next/link";

export const Navbar = () => {
  return (
    <nav className="container mx-auto px-4 py-4 flex items-end justify-between mb-10">
      <h1 className="text-2xl font-bold">PosterQuest</h1>

      <Link
        href="https://hjorturfreyr.com"
        target="_blank"
        className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors duration-150"
      >
        Created by Hjörtur Freyr
      </Link>
    </nav>
  );
};
