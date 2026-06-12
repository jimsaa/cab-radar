import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseCookieOptions } from "./cookies";
import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
  getSupabaseUrl,
} from "./env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookieOptions: getSupabaseCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component — middleware handles refresh
        }
      },
    },
  });
}

export async function createServiceClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
