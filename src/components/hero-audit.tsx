const ROWS = [
  ["Cursor Teams (2 seats)", "→ Cursor Pro", "$40/mo"],
  ["ChatGPT Plus", "→ Claude Pro", "$0/mo"],
  ["Anthropic API ($1,800/mo)", "→ via Credex credits", "$450/mo"],
  ["Copilot Pro+", "→ already a fit", "—"],
] as const;

// Server component — no client JS ships for the landing-page hero. The
// browser handles video autoplay natively; the static audit preview sits
// underneath and shows through if the video fails or hasn't loaded yet.
// Mobile users see only the static card (video is `hidden` below md).
export function HeroAudit() {
  return (
    <div className="border-border bg-card relative aspect-square overflow-hidden rounded-2xl border shadow-sm">
      <div className="absolute inset-0 p-6">
        <p className="text-muted-fg font-mono text-xs tracking-tight uppercase">
          Sample audit
        </p>
        <p className="mt-2 text-3xl font-medium tracking-tight">
          You could save <span className="text-accent">$612</span>
          <span className="text-muted-fg text-xl font-normal">/mo</span>
        </p>
        <p className="text-muted-fg mt-1 text-sm">
          ${(612 * 12).toLocaleString()} per year · across 4 tools
        </p>
        <ul className="mt-6 space-y-3 text-sm">
          {ROWS.map(([from, to, save]) => (
            <li
              key={from}
              className="border-border/60 flex items-baseline justify-between border-b pb-3 last:border-0"
            >
              <div>
                <p className="font-medium">{from}</p>
                <p className="text-muted-fg text-xs">{to}</p>
              </div>
              <span className="text-success font-mono text-sm tabular-nums">
                {save}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <video
        className="absolute inset-0 hidden h-full w-full object-cover md:block"
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster="/hero-audit-poster.webp"
      >
        <source src="/hero-audit.webm" type="video/webm" />
        <source src="/hero-audit.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
