import Image from "next/image";
import Link from "next/link";

interface SiteLogoProps {
  /** Visual size. `sm` is for inner-page headers, `md` for the landing hero. */
  size?: "sm" | "md";
  /** Render the "snipper" wordmark next to the mark. */
  withWordmark?: boolean;
  /** Render as a Link to `/` (default) or a plain span (e.g. inside another link). */
  asLink?: boolean;
  className?: string;
}

const SIZES = {
  sm: { px: 22, text: "text-xs" },
  md: { px: 28, text: "text-base" },
} as const;

export function SiteLogo({
  size = "md",
  withWordmark = true,
  asLink = true,
  className = "",
}: SiteLogoProps) {
  const { px, text } = SIZES[size];

  const content = (
    <span className={`inline-flex items-center gap-2 font-mono tracking-tight ${text}`}>
      <Image
        src="/snipper-logo-512.png"
        alt=""
        width={px}
        height={px}
        priority
        className="rounded-md"
      />
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
