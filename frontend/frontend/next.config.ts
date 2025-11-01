import type { NextConfig } from "next";

// Explicitly tell Turbopack which directory is the project root so it picks up the app and API routes.
const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
