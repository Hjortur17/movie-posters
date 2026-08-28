import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async redirects() {
    return [
      {
        // Send the auto-assigned Vercel host to the canonical domain.
        // /api is excluded so Vercel's cron invocation is never redirected,
        // and matching the exact host leaves preview deployments alone.
        source: "/:path((?!api/).*)",
        has: [{ type: "host", value: "poster-quest.vercel.app" }],
        destination: "https://posterquest.hjorturfreyr.com/:path",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
