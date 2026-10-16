import type { NextConfig } from "next";

// cacheComponents/partialPrefetching (create-next-app 16 defaults) are off: the POC renders
// each request from the repository and doesn't use Suspense-based caching yet.
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
