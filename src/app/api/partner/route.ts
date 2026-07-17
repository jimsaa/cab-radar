import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

interface PartnerBody {
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  offerDescription?: string;
}

export async function POST(request: Request) {
  let body: PartnerBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ogiltig begäran" }, { status: 400 });
  }

  const companyName = body.companyName?.trim();
  const contactPerson = body.contactPerson?.trim();
  const phone = body.phone?.trim();
  const email = body.email?.trim() || null;
  const offerDescription = body.offerDescription?.trim();

  if (!companyName || companyName.length < 2) {
    return NextResponse.json({ error: "Företagsnamn krävs." }, { status: 400 });
  }
  if (!contactPerson || contactPerson.length < 2) {
    return NextResponse.json({ error: "Kontaktperson krävs." }, { status: 400 });
  }
  if (!phone || phone.length < 6) {
    return NextResponse.json({ error: "Telefonnummer krävs." }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "E-post krävs." }, { status: 400 });
  }
  if (!offerDescription || offerDescription.length < 5) {
    return NextResponse.json(
      { error: "Meddelande krävs." },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServiceClient();
    const { error } = await supabase.from("partner_leads").insert({
      company_name: companyName,
      contact_person: contactPerson,
      phone,
      email,
      offer_description: offerDescription,
      status: "ny",
    });

    if (error) {
      console.error("[PARTNER] insert failed", error);
      return NextResponse.json({ error: "Kunde inte skicka." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PARTNER] error", err);
    return NextResponse.json({ error: "Kunde inte skicka." }, { status: 500 });
  }
}
