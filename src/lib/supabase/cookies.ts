import type { CookieOptions } from "@supabase/ssr";

/** Allow auth cookies over HTTP when testing on phone via LAN IP (e.g. http://192.168.x.x:3005). */
export function getSupabaseCookieOptions(): CookieOptions {
  return {
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}
