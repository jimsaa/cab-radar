import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    if (userId && session.payment_status === "paid") {
      const supabase = await createServiceClient();
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);

      await supabase
        .from("profiles")
        .update({
          membership_type: "annual_member",
          membership_expires_at: expires.toISOString(),
          stripe_customer_id: session.customer as string | null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }
  }

  return NextResponse.json({ received: true });
}
