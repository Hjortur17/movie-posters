import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const vt323 = VT323({
  variable: "--font-vt323",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const title = "PosterQuest — Name the film behind the pixels";
const description =
  "Guess the movie from the pixelated poster. You get 5 guesses, and the image gets clearer with each one!";

export const metadata: Metadata = {
  metadataBase: new URL("https://posterquest.hjorturfreyr.com"),
  title,
  description,
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    type: "website",
    siteName: "PosterQuest",
    url: "/",
    title,
    description,
    images: [
      {
        url: "/og.jpg",
        width: 2400,
        height: 1260,
        alt: title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={cn(pressStart.variable, vt323.variable, "antialiased")}>
        {children}
      </body>
    </html>
  );
}
