import { NextResponse } from "next/server";
import {
  canManageOffers,
  fetchAdminRoleProfile,
  isFullAdmin,
} from "@/lib/admin-access";
import { createClient } from "@/lib/supabase/server";

async function requireOfferManager() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Logga in." }, { status: 401 }) };

  const profile = await fetchAdminRoleProfile(supabase, user.id);
  if (!canManageOffers(profile)) {
    return {
      error: NextResponse.json(
        { error: "Du saknar behörighet att hantera erbjudanden." },
        { status: 403 }
      ),
    };
  }

  return { supabase, user, profile };
}

interface OfferBody {
  id?: string;
  business_name?: string;
  offer_title?: string;
  start_date?: string | null;
  valid_until?: string | null;
  banner_a_url?: string | null;
  banner_b_url?: string | null;
  redemption_text?: string;
  admin_notes?: string;
  is_active?: boolean;
}

export async function POST(request: Request) {
  const auth = await requireOfferManager();
  if ("error" in auth && auth.error) return auth.error;
  const { supabase } = auth;

  let body: OfferBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  if (!body.business_name?.trim() || !body.offer_title?.trim()) {
    return NextResponse.json(
      { error: "Partnernamn och titel krävs." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("taxi_deals")
    .insert({
      business_name: body.business_name.trim(),
      offer_title: body.offer_title.trim(),
      offer_description: "",
      address: "",
      start_date: body.start_date || null,
      valid_until: body.valid_until || null,
      banner_a_url: body.banner_a_url || null,
      banner_b_url: body.banner_b_url || null,
      redemption_text: body.redemption_text?.trim() ?? "",
      admin_notes: body.admin_notes?.trim() ?? "",
      is_active: body.is_active ?? true,
      monthly_partner_fee: 0,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[OFFERS] create failed:", error);
    return NextResponse.json({ error: "Kunde inte skapa erbjudande." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: Request) {
  const auth = await requireOfferManager();
  if ("error" in auth && auth.error) return auth.error;
  const { supabase } = auth;

  let body: OfferBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "Erbjudande saknas." }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.business_name !== undefined) updates.business_name = body.business_name.trim();
  if (body.offer_title !== undefined) updates.offer_title = body.offer_title.trim();
  if (body.start_date !== undefined) updates.start_date = body.start_date || null;
  if (body.valid_until !== undefined) updates.valid_until = body.valid_until || null;
  if (body.banner_a_url !== undefined) updates.banner_a_url = body.banner_a_url;
  if (body.banner_b_url !== undefined) updates.banner_b_url = body.banner_b_url;
  if (body.redemption_text !== undefined) updates.redemption_text = body.redemption_text.trim();
  if (body.admin_notes !== undefined) updates.admin_notes = body.admin_notes.trim();
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  const { error } = await supabase
    .from("taxi_deals")
    .update(updates)
    .eq("id", body.id);

  if (error) {
    console.error("[OFFERS] update failed:", error);
    return NextResponse.json({ error: "Kunde inte uppdatera erbjudande." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireOfferManager();
  if ("error" in auth && auth.error) return auth.error;
  const { supabase, profile } = auth;

  if (!isFullAdmin(profile)) {
    return NextResponse.json(
      { error: "Endast administratörer kan radera erbjudanden." },
      { status: 403 }
    );
  }

  let body: { id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "Erbjudande saknas." }, { status: 400 });
  }

  const { error } = await supabase.from("taxi_deals").delete().eq("id", body.id);

  if (error) {
    console.error("[OFFERS] delete failed:", error);
    return NextResponse.json({ error: "Kunde inte radera erbjudande." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
