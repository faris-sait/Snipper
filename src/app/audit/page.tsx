import Link from "next/link";

export default function AuditPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-muted-fg font-mono text-xs tracking-tight uppercase">Coming this week</p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight md:text-4xl">
        The audit form lands in Phase 2.
      </h1>
      <p className="text-muted-fg pretty mt-4 text-base leading-relaxed">
        The pricing engine and audit logic are already running — see{" "}
        <code className="font-mono text-sm">src/lib/audit/</code>. The input form ships next.
      </p>
      <Link
        href="/"
        className="bg-accent text-accent-fg mt-8 inline-flex h-11 items-center rounded-md px-5 text-sm font-medium tracking-tight"
      >
        Back to home
      </Link>
    </main>
  );
}
