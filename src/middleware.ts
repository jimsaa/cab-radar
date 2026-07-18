import { NextResponse, type NextRequest } from "next/server";
import {
  enforceComingSoonWall,
  enforceTeslaBetaRouteLock,
} from "@/lib/coming-soon-gate";
import {
  COUNTRY_COOKIE,
  COUNTRY_HEADER,
  resolveCountryCodeFromHost,
} from "@/lib/country-routing/hostname";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const countryCode = resolveCountryCodeFromHost(host);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(COUNTRY_HEADER, countryCode);

  const { supabaseResponse, supabase, user } = await updateSession(request, {
    requestHeaders,
  });

  supabaseResponse.headers.set(COUNTRY_HEADER, countryCode);
  supabaseResponse.cookies.set(COUNTRY_COOKIE, countryCode, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  const gateRedirect = await enforceComingSoonWall(request, supabase, user);
  if (gateRedirect) {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      gateRedirect.cookies.set(cookie.name, cookie.value);
    });
    gateRedirect.cookies.set(COUNTRY_COOKIE, countryCode, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    gateRedirect.headers.set(COUNTRY_HEADER, countryCode);
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
    teslaBetaRedirect.cookies.set(COUNTRY_COOKIE, countryCode, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
    teslaBetaRedirect.headers.set(COUNTRY_HEADER, countryCode);
    return teslaBetaRedirect;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
