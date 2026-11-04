import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite (the local fallback database) ships WASM files. Keep it out of the server bundle.
  serverExternalPackages: ["@electric-sql/pglite"],
  // The Review agent reads the knowledge files at run time.
  outputFileTracingIncludes: { "/api/**": ["./knowledge/**", "./drizzle/**"] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
