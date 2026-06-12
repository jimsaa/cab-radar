import { NextResponse } from "next/server";
import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/server";
import { alertTypeLabel, isCurrentAlertType } from "@/lib/constants";
import { PUSH_NOTIFICATION_TYPES } from "@/lib/constants";
import { sendNearbyEmergencyPush } from "@/lib/emergency-notifications";
import type { AlertType } from "@/lib/constants";

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@cabrader.app";

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function POST(request: Request) {
  if (!configureWebPush()) {
    return NextResponse.json({ skipped: true, reason: "VAPID not configured" });
  }

  const body = await request.json();
  const {
    alertId,
    type,
    title,
    is_major,
    created_by,
    latitude,
    longitude,
    emergency_last_latitude,
    emergency_last_longitude,
  } = body as {
    alertId: string;
    type: string;
    title: string;
    is_major?: boolean;
    created_by?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    emergency_last_latitude?: number | null;
    emergency_last_longitude?: number | null;
  };

  const shouldNotify =
    (isCurrentAlertType(type) &&
      PUSH_NOTIFICATION_TYPES.includes(type as AlertType)) ||
    type === "total_stop_accident" ||
    type === "hazard_on_road" ||
    (type === "slow_traffic" && is_major);

  if (!shouldNotify) {
    return NextResponse.json({ skipped: true });
  }

  const supabase = await createServiceClient();

  if (type === "taxi_emergency") {
    const sent = await sendNearbyEmergencyPush(supabase, {
      id: alertId,
      created_by: created_by ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      emergency_last_latitude: emergency_last_latitude ?? null,
      emergency_last_longitude: emergency_last_longitude ?? null,
    });
    return NextResponse.json({ sent, nearby: true });
  }

  const { data: subs } = await supabase.from("push_subscriptions").select("*");

  if (!subs?.length) {
    return NextResponse.json({ sent: 0 });
  }

  const label = alertTypeLabel(type) || title;
  const payload = JSON.stringify({
    title: `CabRadar: ${label}`,
    body: title,
    url: `/`,
    alertId,
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
      } catch {
        if (sub.endpoint) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }
    })
  );

  return NextResponse.json({ sent });
}
