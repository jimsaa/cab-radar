import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hasBetaGateCookie,
  isBetaGatePath,
  isComingSoonApiAllowed,
  isComingSoonEnabled,
  isComingSoonPublicPath,
  redirectToComingSoon,
} from "./coming-soon";
import { isMissingSchemaError } from "./db-errors";
import { isTeslaBetaAllowedPath } from "./tesla-beta";

export async function profileHasBetaAppAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const full = await supabase
    .from("profiles")
    .select("is_admin, beta_user")
    .eq("id", userId)
    .single();

  if (!full.error && full.data) {
    return Boolean(full.data.is_admin || full.data.beta_user);
  }

  if (full.error && !isMissingSchemaError(full.error)) {
    return false;
  }

  const minimal = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  return Boolean(minimal.data?.is_admin);
}

/** Enforce private beta wall when COMING_SOON_ENABLED=true. */
export async function enforceComingSoonWall(
  request: NextRequest,
  supabase: SupabaseClient,
  user: User | null
): Promise<NextResponse | null> {
  if (!isComingSoonEnabled()) return null;

  const path = request.nextUrl.pathname;

  if (isComingSoonApiAllowed(path)) return null;
  if (isComingSoonPublicPath(path)) return null;

  if (user) {
    const hasAccess = await profileHasBetaAppAccess(supabase, user.id);
    if (hasAccess) {
      if (path === "/coming-soon" || path === "/beta-login") {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.search = "";
        return NextResponse.redirect(url);
      }
      return null;
    }

    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (path === "/coming-soon") return null;
    return redirectToComingSoon(request, "not_invited");
  }

  if (hasBetaGateCookie(request) && isBetaGatePath(path)) return null;

  if (path.startsWith("/api/")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (path === "/") {
    return redirectToComingSoon(request);
  }

  if (isBetaGatePath(path)) {
    return redirectToComingSoon(request);
  }

  return redirectToComingSoon(request);
}

/** Tesla Beta users are locked to Tesla View and related APIs. */
export async function enforceTeslaBetaRouteLock(
  request: NextRequest,
  supabase: SupabaseClient,
  user: User | null
): Promise<NextResponse | null> {
  if (!user) return null;

  const path = request.nextUrl.pathname;
  if (isTeslaBetaAllowedPath(path)) return null;

  const full = await supabase
    .from("profiles")
    .select("tesla_beta, membership_type, is_admin")
    .eq("id", user.id)
    .single();

  if (full.error && !isMissingSchemaError(full.error)) {
    return null;
  }

  const row = full.data;
  if (!row || row.is_admin) return null;

  const isTeslaBeta =
    Boolean(row.tesla_beta) || row.membership_type === "tesla_beta";
  if (!isTeslaBeta) return null;

  const url = request.nextUrl.clone();
  url.pathname = "/tesla";
  url.search = "";
  return NextResponse.redirect(url);
}
