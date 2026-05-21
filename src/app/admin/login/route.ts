import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /admin/login?token=<X>
 *
 * Lightweight cookie-exchange endpoint for the admin dashboard. Validates the
 * supplied token against `ADMIN_TOKEN`, writes an HttpOnly cookie, and
 * redirects to `/admin`. A bad token redirects back to `/admin?denied=1`
 * instead of leaking detail — there is no constant-time difference visible
 * to the caller beyond the redirect target.
 */
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!verifyAdminToken(token)) {
    return NextResponse.redirect(new URL("/admin?denied=1", url));
  }

  const response = NextResponse.redirect(new URL("/admin", url));
  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token!,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // 12-hour session is enough for one evaluator review pass.
    maxAge: 60 * 60 * 12,
  });
  return response;
}
