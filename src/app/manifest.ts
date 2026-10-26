import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "POS-Sinaptex",
    short_name: "Sinaptex",
    description: "Smart Retail Operations & Accounting untuk toko UMKM",
    start_url: "/",
    display: "standalone",
    background_color: "#0B2F6E",
    theme_color: "#0B2F6E",
    lang: "id",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
