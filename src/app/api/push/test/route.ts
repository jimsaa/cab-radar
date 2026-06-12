import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

function configureWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@cabrader.app";

  if (!publicKey || !privateKey) {
    console.error("[PUSH] Test skipped: VAPID not configured");
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function POST(request: Request) {
  if (!configureWebPush()) {
    return NextResponse.json(
      { error: "VAPID är inte konfigurerat." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Du måste vara inloggad." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Endast administratörer." }, { status: 403 });
  }

  let endpoint: string | undefined;
  try {
    const body = await request.json();
    endpoint = body.endpoint;
  } catch {
    // optional body
  }

  let query = supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", user.id);

  if (endpoint) {
    query = query.eq("endpoint", endpoint);
  }

  const { data: subs, error } = await query;

  if (error) {
    console.error("[PUSH] Test lookup failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!subs?.length) {
    return NextResponse.json(
      { ok: true, sent: 0, error: "Ingen prenumeration hittades på den här enheten." },
      { status: 404 }
    );
  }

  const payload = JSON.stringify({
    title: "CabRadar-test",
    body: "Push-notiser fungerar på den här enheten.",
    url: "/settings",
  });

  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        );
        sent++;
      } catch (err) {
        console.error("[PUSH] Test send failed:", err);
        if (sub.endpoint) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }
    })
  );

  if (sent === 0) {
    return NextResponse.json(
      { error: "Kunde inte skicka testnotis." },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, sent });
}
