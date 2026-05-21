import { cookies } from "next/headers";
import type { Metadata } from "next";

import { SiteLogo } from "@/components/site-logo";
import { Card, CardBody } from "@/components/ui/card";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/admin/auth";
import { loadAdminMetrics, type AdminMetrics } from "@/lib/db/admin-metrics";
import { isPersistenceConfigured } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Admin · Snipper",
  description: "Reaudit pipeline health.",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ denied?: string }>;
}

export default async function AdminPage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const supplied = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const authed = verifyAdminToken(supplied);

  if (!authed) {
    const { denied } = await searchParams;
    return <UnauthenticatedView wasDenied={Boolean(denied)} />;
  }

  let metrics: AdminMetrics | null = null;
  let loadError: string | null = null;

  if (!isPersistenceConfigured()) {
    metrics = { audits: 0, notifications: 0, uniqueClicks: 0, ctr: null };
  } else {
    try {
      metrics = await loadAdminMetrics();
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Failed to load metrics.";
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 lg:px-10 lg:py-16">
      <header className="mb-10">
        <SiteLogo size="sm" />
        <h1 className="balance mt-4 text-4xl font-medium tracking-tight md:text-5xl">
          Admin.
        </h1>
        <p className="text-muted-fg pretty mt-3 max-w-xl text-base leading-relaxed">
          Reaudit pipeline health. Every counter reads live from Supabase; the
          page has no client JS and revalidates on each request.
        </p>
      </header>

      {loadError ? (
        <Card>
          <CardBody className="p-6">
            <p className="text-sm font-medium">Failed to load metrics</p>
            <p className="text-muted-fg mt-2 font-mono text-xs">{loadError}</p>
          </CardBody>
        </Card>
      ) : metrics ? (
        <MetricsGrid metrics={metrics} />
      ) : null}

      <section className="mt-12">
        <h2 className="text-xs font-mono uppercase tracking-tight text-muted-fg">
          How the numbers are sourced
        </h2>
        <ul className="text-muted-fg mt-3 space-y-1 font-mono text-xs leading-relaxed">
          <li>
            <strong className="text-fg">Audits</strong>: <code>count(audits)</code>
          </li>
          <li>
            <strong className="text-fg">Reaudit emails sent</strong>:{" "}
            <code>count(reaudit_notifications)</code>
          </li>
          <li>
            <strong className="text-fg">Unique clicks</strong>:{" "}
            <code>count(distinct (audit_id, pricing_version))</code> from{" "}
            <code>reaudit_clicks</code>, populated when an email recipient
            visits <code>/a/[id]/rerun?v=&lt;pricing_version&gt;</code>.
          </li>
          <li>
            <strong className="text-fg">CTR</strong>: unique clicks ÷ notifications.
          </li>
        </ul>
      </section>
    </main>
  );
}

function MetricsGrid({ metrics }: { metrics: AdminMetrics }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MetricCard label="Audits" value={metrics.audits.toLocaleString()} />
      <MetricCard
        label="Reaudit emails sent"
        value={metrics.notifications.toLocaleString()}
      />
      <MetricCard
        label="CTR"
        value={
          metrics.ctr === null ? "—" : `${(metrics.ctr * 100).toFixed(1)}%`
        }
        sub={
          metrics.notifications > 0
            ? `${metrics.uniqueClicks.toLocaleString()} unique clicks`
            : "no notifications yet"
        }
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardBody className="p-6">
        <p className="text-muted-fg font-mono text-[11px] tracking-tight uppercase">
          {label}
        </p>
        <p className="mt-2 text-3xl font-medium tracking-tight md:text-4xl">
          {value}
        </p>
        {sub ? <p className="text-muted-fg mt-1 text-xs">{sub}</p> : null}
      </CardBody>
    </Card>
  );
}

function UnauthenticatedView({ wasDenied }: { wasDenied: boolean }) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-16 lg:px-10 lg:py-24">
      <SiteLogo size="sm" />
      <h1 className="mt-4 text-3xl font-medium tracking-tight">Admin.</h1>
      <p className="text-muted-fg mt-3 text-sm leading-relaxed">
        This dashboard is gated behind <code>ADMIN_TOKEN</code>. Visit{" "}
        <code>/admin/login?token=&lt;your-token&gt;</code> to set the session
        cookie.
      </p>
      {wasDenied ? (
        <p className="mt-4 text-sm font-medium text-red-600">
          That token didn&rsquo;t match. Try again.
        </p>
      ) : null}
    </main>
  );
}
