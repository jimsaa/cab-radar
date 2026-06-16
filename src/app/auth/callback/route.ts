import { NextResponse } from "next/server";

import {
  fetchPreferredView,
  redirectPathForPreferredView,
} from "@/lib/preferred-view-server";
import { teslaBetaLoginRedirect } from "@/lib/tesla-beta";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const supabase = await createClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tesla_beta, membership_type, is_admin")
      .eq("id", user.id)
      .maybeSingle();

    const teslaRedirect = teslaBetaLoginRedirect(profile);
    if (teslaRedirect && (next === "/" || next === "/login")) {
      return NextResponse.redirect(`${origin}${teslaRedirect}`);
    }

    const preferred = await fetchPreferredView(supabase, user.id);
    const preferredHome = redirectPathForPreferredView(preferred, next);

    if (preferredHome) {
      return NextResponse.redirect(`${origin}${preferredHome}`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
