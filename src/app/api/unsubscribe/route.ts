import { NextResponse } from "next/server";

import { markEmailUnsubscribed } from "@/lib/db/audits";
import { isPersistenceConfigured } from "@/lib/db/supabase";
import { verifyUnsubscribeToken } from "@/lib/email/unsubscribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Phase 7.6 — stateless unsubscribe.
 *
 * Token is `HMAC(email, UNSUBSCRIBE_SECRET)`; no extra table needed. Supports
 * both GET (link in email body) and POST (RFC 8058 one-click via the
 * `List-Unsubscribe-Post` header). Successful GET renders a plain HTML
 * confirmation page; POST returns 204 — Gmail/Apple Mail expect a 2xx.
 */
async function handle(
  email: string | null,
  token: string | null,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  if (!email || !token) {
    return { ok: false, status: 400, message: "Missing email or token." };
  }
  if (!process.env.UNSUBSCRIBE_SECRET) {
    return { ok: false, status: 503, message: "Unsubscribe not configured." };
  }
  if (!verifyUnsubscribeToken(email, token)) {
    return { ok: false, status: 403, message: "Invalid unsubscribe token." };
  }
  if (!isPersistenceConfigured()) {
    return { ok: false, status: 503, message: "Persistence not configured." };
  }

  try {
    await markEmailUnsubscribed(email);
    return { ok: true };
  } catch (error) {
    console.error("[unsubscribe] failed:", error);
    return { ok: false, status: 500, message: "Failed to unsubscribe." };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderPage(body: string, status: number): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Unsubscribed — Snipper</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; background:#faf9f6; color:#1a1a18; margin:0; padding:48px 24px; }
  main { max-width: 520px; margin: 0 auto; background:#fff; border:1px solid #e7e4dc; border-radius:12px; padding:32px; }
  h1 { font-size: 22px; margin: 0 0 12px; }
  p { color:#5a5a55; line-height: 1.55; margin: 0 0 12px; }
  a { color:#1a1a18; }
</style>
</head>
<body>
<main>${body}</main>
</body>
</html>`;

  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  const token = url.searchParams.get("token");

  const result = await handle(email, token);
  if (!result.ok) {
    return renderPage(
      `<h1>Could not unsubscribe</h1><p>${escapeHtml(result.message)}</p>`,
      result.status,
    );
  }

  return renderPage(
    `<h1>You're unsubscribed.</h1><p>We won't send any more re-audit alerts to <strong>${escapeHtml(email ?? "")}</strong>.</p><p>You can still re-run any past audit from its share link.</p>`,
    200,
  );
}

export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  let email = url.searchParams.get("email");
  let token = url.searchParams.get("token");

  // RFC 8058 one-click: providers may POST with form-encoded params instead.
  if ((!email || !token) && req.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    email = email ?? (form.get("email") as string | null);
    token = token ?? (form.get("token") as string | null);
  }

  const result = await handle(email, token);
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }
  return new Response(null, { status: 204 });
}
