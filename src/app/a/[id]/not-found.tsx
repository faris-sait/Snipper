import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function AuditNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-muted-fg font-mono text-xs tracking-tight uppercase">
        Audit not found
      </p>
      <h1 className="mt-3 text-3xl font-medium tracking-tight">
        This share link doesn&apos;t resolve.
      </h1>
      <p className="text-muted-fg pretty mt-3 max-w-md text-base">
        It may have been deleted, or persistence isn&apos;t configured on this
        deployment. You can run a fresh audit instead.
      </p>
      <Link
        href="/audit"
        className="bg-accent text-accent-fg mt-8 inline-flex h-11 items-center gap-2 rounded-md px-5 text-sm font-medium tracking-tight"
      >
        Start your audit
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </main>
  );
}
