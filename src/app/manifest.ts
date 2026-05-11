import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Snipper — AI Spend Audit",
    short_name: "Snipper",
    description:
      "A free 60-second audit of your AI tool stack. Surface plan-fit issues, cheaper alternatives, and credit discounts.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfaf6",
    theme_color: "#0d0d0a",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
