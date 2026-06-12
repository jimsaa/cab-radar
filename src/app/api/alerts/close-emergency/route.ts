import { NextResponse } from "next/server";

import { createClient, createServiceClient } from "@/lib/supabase/server";

import { broadcastPushToDrivers } from "@/lib/push-server";

import { hasEmergencyAdminAccess } from "@/lib/admin-access";
import { isVerifiedDriver } from "@/lib/verification";



export async function POST(request: Request) {

  const supabase = await createClient();

  const {

    data: { user },

  } = await supabase.auth.getUser();



  if (!user) {

    return NextResponse.json({ error: "Logga in först." }, { status: 401 });

  }



  const { data: profile } = await supabase

    .from("profiles")

    .select("verification_status, is_admin, is_co_admin")

    .eq("id", user.id)

    .single();



  if (!profile) {

    return NextResponse.json({ error: "Profil saknas." }, { status: 403 });

  }



  let body: { alertId?: string };

  try {

    body = await request.json();

  } catch {

    return NextResponse.json({ error: "Ogiltig begäran" }, { status: 400 });

  }



  const alertId = body.alertId;

  if (!alertId) {

    return NextResponse.json({ error: "Varning saknas." }, { status: 400 });

  }



  const { data: alert } = await supabase

    .from("driver_alerts")

    .select("id, type, status, created_by")

    .eq("id", alertId)

    .single();



  if (!alert || alert.type !== "taxi_emergency" || alert.status !== "active") {

    return NextResponse.json(

      { error: "Nödläget är inte längre aktivt." },

      { status: 400 }

    );

  }



  const isAdmin = hasEmergencyAdminAccess(profile);

  const isCreator = alert.created_by === user.id;



  if (!isAdmin && !isCreator) {

    return NextResponse.json({ error: "Behörighet saknas." }, { status: 403 });

  }



  if (!isAdmin && !isVerifiedDriver(profile)) {

    return NextResponse.json({ error: "Kräver verifierad förare." }, { status: 403 });

  }



  const now = new Date().toISOString();

  const { error } = await supabase

    .from("driver_alerts")

    .update({

      status: "expired",

      expires_at: now,

      updated_at: now,

      validation_status: "resolved",

    })

    .eq("id", alertId);



  if (error) {

    console.error("[EMERGENCY CLOSE] failed", error);

    return NextResponse.json({ error: "Kunde inte avsluta nödläge." }, { status: 500 });

  }



  let pushSent = 0;

  if (isCreator && !isAdmin) {

    try {

      const service = await createServiceClient();

      pushSent = await broadcastPushToDrivers(service, {

        title: "CabRadar",

        body: "En förare har avslutat sitt nödläge. Allt är OK.",

        url: "/",

        excludeUserId: user.id,

      });

    } catch (pushError) {

      console.error("[EMERGENCY CLOSE] push broadcast failed", pushError);

    }

  }



  return NextResponse.json({ ok: true, pushSent });

}


