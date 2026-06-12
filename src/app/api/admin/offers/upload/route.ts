import { NextResponse } from "next/server";
import { canManageOffers, fetchAdminRoleProfile } from "@/lib/admin-access";
import {
  OFFER_BANNER_MAX_BYTES,
  extensionForMime,
  offerStoragePath,
  publicStorageUrl,
} from "@/lib/offers";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Logga in." }, { status: 401 });
  }

  const profile = await fetchAdminRoleProfile(supabase, user.id);
  if (!canManageOffers(profile)) {
    return NextResponse.json({ error: "Behörighet saknas." }, { status: 403 });
  }

  const form = await request.formData();
  const offerId = form.get("offerId");
  const slot = form.get("slot");
  const file = form.get("file");

  if (typeof offerId !== "string" || !offerId) {
    return NextResponse.json({ error: "Erbjudande saknas." }, { status: 400 });
  }

  if (slot !== "banner-a" && slot !== "banner-b") {
    return NextResponse.json({ error: "Ogiltig banner." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Ingen fil." }, { status: 400 });
  }

  if (file.size > OFFER_BANNER_MAX_BYTES) {
    return NextResponse.json({ error: "Max 5 MB." }, { status: 400 });
  }

  const ext = extensionForMime(file.type);
  if (!ext) {
    return NextResponse.json(
      { error: "Endast JPG, PNG eller WEBP." },
      { status: 400 }
    );
  }

  const path = offerStoragePath(offerId, slot, ext);
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("offers")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    console.error("[OFFERS] upload failed:", uploadError);
    return NextResponse.json({ error: "Uppladdning misslyckades." }, { status: 500 });
  }

  const url = publicStorageUrl(getSupabaseUrl(), path);
  const column = slot === "banner-a" ? "banner_a_url" : "banner_b_url";

  const { error: updateError } = await supabase
    .from("taxi_deals")
    .update({ [column]: url, updated_at: new Date().toISOString() })
    .eq("id", offerId);

  if (updateError) {
    console.error("[OFFERS] url update failed:", updateError);
    return NextResponse.json({ error: "Kunde inte spara banner-URL." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url, column });
}
