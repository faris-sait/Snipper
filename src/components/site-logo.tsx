import Link from "next/link";

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

const LOGO_PATH =
  "M212.12 372.87 C199.17 370.72 186.91 365.25 176.13 356.80 C169.69 351.76 160.05 340.46 160.09 338.00 C160.10 337.18 164.23 333.12 169.25 329.00 C174.28 324.88 180.79 319.52 183.72 317.11 L189.04 312.72 L195.46 318.89 C208.15 331.08 213.83 332.24 258.52 331.81 C289.46 331.52 291.78 331.37 296.00 329.42 C310.28 322.81 314.72 304.16 304.62 293.25 C302.45 290.91 300.73 290.00 298.47 290.00 C294.08 290.00 157.56 309.83 150.00 311.57 C136.39 314.69 188.78 296.88 294.23 262.52 L329.96 250.88 L331.83 246.64 C341.84 224.02 373.33 223.52 384.10 245.81 C386.95 251.69 387.21 263.46 384.63 269.27 C378.08 284.03 360.13 290.74 345.90 283.75 C340.88 281.29 336.00 280.17 336.00 281.49 C336.00 281.76 337.97 284.86 340.38 288.39 C346.96 298.00 348.52 303.43 348.42 316.50 C348.21 343.79 328.32 366.67 299.79 372.44 C291.07 374.21 222.18 374.54 212.12 372.87 Z M315.55 278.55 C318.54 275.55 318.65 273.10 315.93 269.63 C311.89 264.51 303.67 267.43 303.67 274.00 C303.67 280.42 310.91 283.19 315.55 278.55 Z M225.50 273.26 C192.89 267.21 173.01 255.00 163.13 234.94 C143.78 195.70 167.74 148.15 211.21 139.53 C220.54 137.68 287.75 137.31 297.57 139.05 C305.35 140.44 320.17 147.79 326.67 153.49 C332.52 158.61 341.24 169.72 340.79 171.48 C340.30 173.45 311.37 197.31 310.07 196.82 C309.61 196.64 307.70 194.47 305.83 192.00 C301.05 185.66 294.17 181.29 287.74 180.50 C284.86 180.14 268.10 180.00 250.50 180.18 C220.51 180.48 218.22 180.63 214.00 182.59 C199.42 189.37 194.64 206.68 204.30 217.68 C209.73 223.88 216.70 226.25 262.76 237.56 C288.38 243.85 305.72 248.56 304.90 249.01 C304.13 249.43 294.95 252.48 284.50 255.80 C274.05 259.11 259.20 263.85 251.50 266.31 C231.98 272.57 227.79 273.69 225.50 273.26 Z M365.03 271.75 C373.12 267.67 376.03 258.91 371.96 250.92 C367.17 241.53 354.66 239.50 347.25 246.91 C334.68 259.47 349.20 279.74 365.03 271.75 Z";

function SnipperMark({ px }: { px: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={px}
      height={px}
      viewBox="140 130 254 251"
      fill="currentColor"
      aria-hidden
      className="text-accent shrink-0"
    >
      <path fillRule="evenodd" d={LOGO_PATH} />
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
