import { NextResponse } from "next/server";
import { getBetaGatePassword, setBetaGateCookie } from "@/lib/coming-soon";

export async function POST(request: Request) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  const password = body.password?.trim() ?? "";
  if (!password) {
    return NextResponse.json({ error: "Ange beta-kod." }, { status: 400 });
  }

  if (password !== getBetaGatePassword()) {
    return NextResponse.json({ error: "Fel beta-kod." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  setBetaGateCookie(response);
  return response;
}
