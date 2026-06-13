import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { formatSupabaseError, isMissingSchemaError } from "@/lib/db-errors";
import {
  isNicknameConflictError,
  NICKNAME_TAKEN_MESSAGE,
  nicknameLookupKey,
  normalizeNickname,
  validateNickname,
} from "@/lib/driver-nickname";

function schemaMissingResponse() {
  return NextResponse.json(
    {
      error:
        "Visningsnamn är inte aktiverat i databasen ännu. Be administratör köra migration-nickname-save-fix.sql.",
    },
    { status: 503 }
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Logga in först." }, { status: 401 });
    }

    let body: { nickname?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
    }

    const validationError = validateNickname(body.nickname ?? "");
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const nickname = normalizeNickname(body.nickname ?? "");
    const service = await createServiceClient();

    const { data: current, error: currentError } = await service
      .from("profiles")
      .select("nickname")
      .eq("id", user.id)
      .maybeSingle();

    if (currentError) {
      console.error("Nickname save failed: profile read:", currentError);
      if (isMissingSchemaError(currentError)) {
        return schemaMissingResponse();
      }
      return NextResponse.json(
        { error: formatSupabaseError(currentError) },
        { status: 500 }
      );
    }

    if (
      current?.nickname &&
      nicknameLookupKey(current.nickname) === nicknameLookupKey(nickname)
    ) {
      return NextResponse.json({ ok: true, nickname });
    }

    const { data: existing, error: takenError } = await service
      .from("profiles")
      .select("id")
      .ilike("nickname", nickname)
      .neq("id", user.id)
      .maybeSingle();

    if (takenError) {
      console.error("Nickname save failed: uniqueness check:", takenError);
      if (isMissingSchemaError(takenError)) {
        return schemaMissingResponse();
      }
      return NextResponse.json(
        { error: formatSupabaseError(takenError) },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json({ error: NICKNAME_TAKEN_MESSAGE }, { status: 409 });
    }

    const { data: updated, error: updateError } = await service
      .from("profiles")
      .update({
        nickname,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id)
      .select("nickname")
      .maybeSingle();

    if (updateError) {
      console.error("Nickname save failed:", updateError);
      if (isNicknameConflictError(updateError)) {
        return NextResponse.json({ error: NICKNAME_TAKEN_MESSAGE }, { status: 409 });
      }
      if (isMissingSchemaError(updateError)) {
        return schemaMissingResponse();
      }
      return NextResponse.json(
        { error: formatSupabaseError(updateError) },
        { status: 500 }
      );
    }

    if (!updated) {
      console.error("Nickname save failed: no profile row for user", user.id);
      return NextResponse.json(
        { error: "Profilen hittades inte." },
        { status: 404 }
      );
    }

    const saved = (updated.nickname as string | null) ?? nickname;
    return NextResponse.json({ ok: true, nickname: saved });
  } catch (err) {
    console.error("Nickname save failed:", err);
    return NextResponse.json(
      { error: formatSupabaseError(err) },
      { status: 500 }
    );
  }
}
