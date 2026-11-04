import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (the local fallback database) ships WASM files. Keep it out of the server bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
  // The Review agent reads the knowledge files at run time.
  outputFileTracingIncludes: { "/api/**": ["./knowledge/**", "./drizzle/**"] },
};

export default nextConfig;
