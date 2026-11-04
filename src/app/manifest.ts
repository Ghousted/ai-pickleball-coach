import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI Coach",
    short_name: "AI Coach",
    description: "Film a clip. Get coached. Earn XP.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#042330",
    theme_color: "#042330",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
