import { NextResponse, type NextRequest } from "next/server";
import {
  enforceComingSoonWall,
  enforceTeslaBetaRouteLock,
} from "@/lib/coming-soon-gate";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, supabase, user } = await updateSession(request);

  const gateRedirect = await enforceComingSoonWall(request, supabase, user);
  if (gateRedirect) {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      gateRedirect.cookies.set(cookie.name, cookie.value);
    });
    return gateRedirect;
  }

  const teslaBetaRedirect = await enforceTeslaBetaRouteLock(
    request,
    supabase,
    user
  );
  if (teslaBetaRedirect) {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      teslaBetaRedirect.cookies.set(cookie.name, cookie.value);
    });
    return teslaBetaRedirect;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
