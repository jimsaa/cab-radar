import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseCookieOptions } from "./cookies";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

export async function updateSession(
  request: NextRequest,
  options?: { requestHeaders?: Headers }
) {
  const nextRequestInit = options?.requestHeaders
    ? { request: { headers: options.requestHeaders } }
    : { request };

  let supabaseResponse = NextResponse.next(nextRequestInit);

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookieOptions: getSupabaseCookieOptions(),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next(nextRequestInit);
          cookiesToSet.forEach(({ name, value, options: cookieOpts }) =>
            supabaseResponse.cookies.set(name, value, cookieOpts)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, supabase, user };
}
