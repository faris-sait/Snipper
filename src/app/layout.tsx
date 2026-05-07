import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TokenTally — Find out what you're really paying for AI",
    template: "%s · TokenTally",
  },
  description:
    "A free 60-second audit of your AI tool stack. We surface plan-fit issues, cheaper alternatives, and credit-based discounts — with sources for every number.",
  applicationName: "TokenTally",
  keywords: [
    "AI spend audit",
    "Cursor pricing",
    "Claude pricing",
    "ChatGPT pricing",
    "AI tool optimization",
    "AI cost benchmarking",
  ],
  openGraph: {
    title: "TokenTally — Find out what you're really paying for AI",
    description:
      "A free 60-second audit of your AI tool stack. Surface plan-fit issues, cheaper alternatives, and credit discounts.",
    url: SITE_URL,
    siteName: "TokenTally",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TokenTally — AI Spend Audit",
    description:
      "Free 60-second audit of your AI stack. Defensible reasoning, cited sources, and a plan to cut spend.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf6" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0d" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="bg-bg text-fg flex min-h-full flex-col">{children}</body>
    </html>
  );
}
