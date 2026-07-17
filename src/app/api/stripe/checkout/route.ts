import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import {
  ANNUAL_MEMBERSHIP_PRICE_SEK,
  MEMBERSHIP_ENABLED,
} from "@/lib/membership";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function POST(request: Request) {
  if (!MEMBERSHIP_ENABLED) {
    return NextResponse.json(
      { error: "Medlemskapsköp är avstängt. CabRadar är gratis för alla taxiförare." },
      { status: 403 }
    );
  }
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Betalning är inte konfigurerad ännu. Kontakta admin." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Logga in först." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("verification_status, is_admin, cabradar_user_id, stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.verification_status !== "verified" && !profile.is_admin)) {
    return NextResponse.json(
      { error: "Endast verifierade förare kan köpa medlemskap." },
      { status: 403 }
    );
  }

  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3005";

  let customerId = profile.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: {
        user_id: user.id,
        cabradar_user_id: profile.cabradar_user_id ?? "",
      },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "sek",
          unit_amount: ANNUAL_MEMBERSHIP_PRICE_SEK * 100,
          product_data: {
            name: "CabRadar årsmedlemskap",
            description: "Tillgång i 12 månader utan aktivitetskrav",
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      user_id: user.id,
      cabradar_user_id: profile.cabradar_user_id ?? "",
    },
    success_url: `${origin}/settings?membership=success`,
    cancel_url: `${origin}/settings?membership=cancel`,
  });

  return NextResponse.json({ url: session.url });
}
