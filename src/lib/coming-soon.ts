import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const BETA_GATE_COOKIE = "cabrader_beta_gate";

/** Paths always reachable during coming soon (no auth). */
export const COMING_SOON_PUBLIC_PATHS = [
  "/coming-soon",
  "/beta-login",
] as const;

/** Paths reachable after beta gate password (before login). */
export const COMING_SOON_BETA_GATE_PATHS = [
  "/login",
  "/signup",
  "/signup/klart",
  "/auth/callback",
  "/tesla-beta",
] as const;

/** API routes that must never be blocked. */
export const COMING_SOON_API_ALLOWLIST = [
  "/api/waitlist",
  "/api/beta-gate",
  "/api/stripe/webhook",
  "/api/cron/",
  "/api/auth/",
] as const;

export function isComingSoonEnabled(): boolean {
  return process.env.COMING_SOON_ENABLED === "true";
}

export function getBetaGatePassword(): string {
  return process.env.BETA_GATE_PASSWORD ?? "7878";
}

export function hasBetaGateCookie(request: NextRequest): boolean {
  return request.cookies.get(BETA_GATE_COOKIE)?.value === "1";
}

export function pathMatchesPrefix(path: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

export function isComingSoonPublicPath(path: string): boolean {
  return pathMatchesPrefix(path, COMING_SOON_PUBLIC_PATHS);
}

export function isBetaGatePath(path: string): boolean {
  return pathMatchesPrefix(path, COMING_SOON_BETA_GATE_PATHS);
}

export function isComingSoonApiAllowed(path: string): boolean {
  return COMING_SOON_API_ALLOWLIST.some((prefix) => path.startsWith(prefix));
}

export function redirectToComingSoon(request: NextRequest, reason?: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/coming-soon";
  url.search = "";
  if (reason) url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

export function setBetaGateCookie(response: NextResponse): void {
  response.cookies.set(BETA_GATE_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
}
