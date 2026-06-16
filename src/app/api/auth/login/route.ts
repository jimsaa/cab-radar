import { NextResponse } from "next/server";
import { translateAuthError } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/server";
import { teslaBetaLoginRedirect } from "@/lib/tesla-beta";
export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (!email || !password) {
    return NextResponse.json(
      { error: "E-post och lösenord krävs." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("[AUTH] Login failed:", email, error.message);
    return NextResponse.json(
      { error: translateAuthError(error.message) },
      { status: 401 }
    );
  }

  if (!data.session) {
    return NextResponse.json(
      { error: "Bekräfta din e-post innan du loggar in." },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tesla_beta, membership_type, is_admin")
    .eq("id", data.user.id)
    .maybeSingle();

  const redirectTo = teslaBetaLoginRedirect(profile);

  console.log("[AUTH] Login success:", email);
  return NextResponse.json({
    ok: true,
    ...(redirectTo ? { redirect: redirectTo } : {}),
  });
}
