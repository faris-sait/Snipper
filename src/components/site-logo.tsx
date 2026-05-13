import Link from "next/link";

import { SNIPPER_LOGO_PATH, SNIPPER_LOGO_VIEWBOX } from "@/lib/brand";

interface SiteLogoProps {
  /** Visual size. `sm` for inner-page headers, `md` for the landing hero, `lg` for marquee placements. */
  size?: "sm" | "md" | "lg";
  /** Render the "snipper" wordmark next to the mark. */
  withWordmark?: boolean;
  /** Render as a Link to `/` (default) or a plain span (e.g. inside another link). */
  asLink?: boolean;
  className?: string;
}

const SIZES = {
  sm: { px: 32, text: "text-sm" },
  md: { px: 48, text: "text-xl" },
  lg: { px: 72, text: "text-3xl" },
} as const;

function SnipperMark({ px }: { px: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={px}
      height={px}
      viewBox={SNIPPER_LOGO_VIEWBOX}
      fill="currentColor"
      aria-hidden
      className="text-accent shrink-0"
    >
      <path fillRule="evenodd" d={SNIPPER_LOGO_PATH} />
    </svg>
  );
}

export function SiteLogo({
  size = "md",
  withWordmark = true,
  asLink = true,
  className = "",
}: SiteLogoProps) {
  const { px, text } = SIZES[size];

  const content = (
    <span
      className={`inline-flex items-center gap-3 font-mono tracking-tight ${text}`}
    >
      <SnipperMark px={px} />
      {withWordmark ? <span>snipper</span> : null}
    </span>
  );

  if (!asLink) {
    return <span className={className}>{content}</span>;
  }

  return (
    <Link
      href="/"
      aria-label="Snipper home"
      className={`transition-opacity hover:opacity-80 ${className}`}
    >
      {content}
    </Link>
  );
}
