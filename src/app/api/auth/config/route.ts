import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getSupabaseConfigError,
  SUPABASE_KEY_MISMATCH_ERROR,
  translateSupabaseAuthError,
} from "@/lib/supabase/config-check";

export async function GET() {
  const error = getSupabaseConfigError();
  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 503 });
  }

  try {
    const supabase = await createServiceClient();
    const { error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    if (authError) {
      const message = translateSupabaseAuthError(authError.message);
      const status = message === SUPABASE_KEY_MISMATCH_ERROR ? 503 : 503;
      return NextResponse.json({ ok: false, error: message }, { status });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: translateSupabaseAuthError(msg) },
      { status: 503 }
    );
  }
}
