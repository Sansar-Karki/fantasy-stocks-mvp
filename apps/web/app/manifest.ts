import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fantasy Stocks",
    short_name: "FanStocks",
    description: "Fantasy football style stock competition with leagues, trades, and weekly matchups.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b1118",
    theme_color: "#0b1118",
    categories: ["finance", "sports"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
