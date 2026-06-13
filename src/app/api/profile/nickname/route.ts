import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  isNicknameConflictError,
  NICKNAME_TAKEN_MESSAGE,
  nicknameLookupKey,
  normalizeNickname,
  validateNickname,
} from "@/lib/driver-nickname";

export async function POST(request: Request) {
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
  const { data: existing } = await service
    .from("profiles")
    .select("id")
    .ilike("nickname", nickname)
    .neq("id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: NICKNAME_TAKEN_MESSAGE }, { status: 409 });
  }

  const { data: current } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .maybeSingle();

  if (
    current?.nickname &&
    nicknameLookupKey(current.nickname) === nicknameLookupKey(nickname)
  ) {
    return NextResponse.json({ ok: true, nickname });
  }

  const { error } = await supabase
    .from("profiles")
    .update({ nickname, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    if (isNicknameConflictError(error)) {
      return NextResponse.json({ error: NICKNAME_TAKEN_MESSAGE }, { status: 409 });
    }
    console.error("[PROFILE] nickname update failed:", error);
    return NextResponse.json(
      { error: "Kunde inte spara smeknamn." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, nickname });
}
