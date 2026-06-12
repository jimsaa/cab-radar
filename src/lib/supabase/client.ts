import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseCookieOptions } from "./cookies";
import { getSupabasePublishableKey, getSupabaseUrl, isSupabaseConfigured } from "./env";

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookieOptions: getSupabaseCookieOptions(),
  });
}

export { isSupabaseConfigured };
