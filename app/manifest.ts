import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Trade Journal",
    short_name: "Trade Journal",
    description: "投資判断を記録し、振り返るためのトレードジャーナル",
    lang: "ja",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#060b16",
    theme_color: "#060b16",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
