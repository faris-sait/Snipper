import Link from "next/link";
import { ArrowRight, FileText, Receipt, Sparkles } from "lucide-react";

import { SiteLogo } from "@/components/site-logo";

const stats = [
  { value: "$0", label: "Cost to run an audit" },
  { value: "60s", label: "Median time to result" },
  { value: "8", label: "AI tools currently scored" },
];

const steps = [
  {
    icon: Receipt,
    title: "List what you pay for",
    body: "Add the AI tools your team uses, the plan you're on, and roughly how much you spend each month.",
  },
  {
    icon: Sparkles,
    title: "We score every line",
    body: "A rules-based engine checks plan-fit, cross-vendor alternatives, and credit-based discounts. Every number traces back to a vendor pricing page.",
  },
  {
    icon: FileText,
    title: "Get a defensible report",
    body: "Per-tool recommendations with one-sentence reasoning a finance reviewer would actually accept. Share it with a unique URL — no PII attached.",
  },
];

export default function Home() {
  return (
    <>
      <header className="border-border/60 mx-auto flex w-full max-w-6xl items-center justify-between border-b px-6 py-5 lg:px-10">
        <SiteLogo size="md" />
        <nav className="text-muted-fg flex items-center gap-6 text-sm">
          <Link href="#how" className="hover:text-fg transition-colors">
            How it works
          </Link>
          <Link
            href="/audit"
            className="bg-accent text-accent-fg rounded-md px-3 py-1.5 text-xs font-medium tracking-tight"
          >
            Run an audit
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 lg:px-10">
        <section className="grid gap-12 py-20 md:grid-cols-12 md:py-28">
          <div className="md:col-span-7">
            <p className="text-muted-fg mb-6 inline-flex items-center gap-2 font-mono text-xs tracking-tight uppercase">
              <span className="bg-success inline-block h-1.5 w-1.5 rounded-full" />
              free · no login · sources cited
            </p>
            <h1 className="balance text-5xl leading-[1.05] font-medium tracking-tight md:text-6xl">
              Find out what you&rsquo;re really{" "}
              <span className="text-accent">paying for AI.</span>
            </h1>
            <p className="text-muted-fg pretty mt-6 max-w-xl text-lg leading-relaxed">
              Most teams pay full retail across five different AI tools and never benchmark.
              Snipper takes 60 seconds to surface plan-fit issues, cheaper alternatives, and
              credit-based discounts — with a vendor URL for every number.
            </p>
            <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link
                href="/audit"
                className="bg-accent text-accent-fg group inline-flex h-12 items-center gap-2 rounded-md px-5 text-sm font-medium tracking-tight"
              >
                Audit my AI spend
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="#how"
                className="text-muted-fg hover:text-fg inline-flex h-12 items-center gap-2 px-3 text-sm transition-colors"
              >
                How it works
              </Link>
            </div>
          </div>
          <aside className="md:col-span-5">
            <div className="border-border bg-card relative rounded-2xl border p-6 shadow-sm">
              <p className="text-muted-fg font-mono text-xs tracking-tight uppercase">
                Sample audit
              </p>
              <p className="mt-2 text-3xl font-medium tracking-tight">
                You could save{" "}
                <span className="text-accent">$612</span>
                <span className="text-muted-fg text-xl font-normal">/mo</span>
              </p>
              <p className="text-muted-fg mt-1 text-sm">
                ${(612 * 12).toLocaleString()} per year · across 4 tools
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {[
                  ["Cursor Teams (2 seats)", "→ Cursor Pro", "$40/mo"],
                  ["ChatGPT Plus", "→ Claude Pro", "$0/mo"],
                  ["Anthropic API ($1,800/mo)", "→ via Credex credits", "$450/mo"],
                  ["Copilot Pro+", "→ already a fit", "—"],
                ].map(([from, to, save]) => (
                  <li key={from} className="border-border/60 flex items-baseline justify-between border-b pb-3 last:border-0">
                    <div>
                      <p className="font-medium">{from}</p>
                      <p className="text-muted-fg text-xs">{to}</p>
                    </div>
                    <span className="text-success font-mono text-sm tabular-nums">{save}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>

        <section className="border-border border-y py-10">
          <dl className="grid grid-cols-3 gap-6 text-center">
            {stats.map((s) => (
              <div key={s.label}>
                <dt className="text-muted-fg font-mono text-xs tracking-tight uppercase">
                  {s.label}
                </dt>
                <dd className="mt-2 text-3xl font-medium tracking-tight tabular-nums">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="how" className="py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-medium tracking-tight md:text-4xl">
              Built like a finance review, not a vibes-check.
            </h2>
            <p className="text-muted-fg pretty mt-4 text-lg">
              Every recommendation traces to a vendor URL and a one-sentence reason a reviewer
              would actually accept.
            </p>
          </div>
          <ol className="mt-14 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className="border-border bg-card rounded-2xl border p-6"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="bg-muted text-muted-fg font-mono inline-flex h-7 w-7 items-center justify-center rounded-md text-xs">
                    0{i + 1}
                  </span>
                  <s.icon className="text-accent h-5 w-5" aria-hidden />
                </div>
                <h3 className="text-lg font-medium tracking-tight">{s.title}</h3>
                <p className="text-muted-fg pretty mt-2 text-sm leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="pb-24">
          <div className="border-border bg-accent text-accent-fg relative overflow-hidden rounded-2xl border p-10 md:p-14">
            <h2 className="balance text-3xl font-medium tracking-tight md:text-4xl">
              Find out in 60 seconds what your AI bill is hiding.
            </h2>
            <p className="mt-4 max-w-xl text-base opacity-80">
              No login. Email is asked once you&rsquo;ve seen the result, and only if you want a
              copy.
            </p>
            <Link
              href="/audit"
              className="bg-accent-fg text-accent mt-8 inline-flex h-12 items-center gap-2 rounded-md px-5 text-sm font-medium tracking-tight"
            >
              Start the audit
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-border/60 mx-auto w-full max-w-6xl border-t px-6 py-8 text-sm lg:px-10">
        <div className="text-muted-fg flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <p>
            © {new Date().getFullYear()} Snipper · Made for{" "}
            <a
              className="hover:text-fg underline-offset-4 transition-colors hover:underline"
              href="https://credex.rocks"
              target="_blank"
              rel="noreferrer"
            >
              credex.rocks
            </a>
          </p>
          <p className="font-mono text-xs">
            Pricing verified 2026-05-07 ·{" "}
            <Link className="hover:text-fg underline-offset-4 hover:underline" href="/pricing-sources">
              sources
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}
