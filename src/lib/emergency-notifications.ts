import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  emergencyAlertCoordinates,
  emergencyAwarenessPath,
  isPresenceFresh,
  isWithinEmergencyNotifyRadius,
  PUBLIC_EMERGENCY_PUSH_BODY,
  PUBLIC_EMERGENCY_PUSH_TITLE,
} from "./emergency-privacy";
import type { DriverAlert } from "./types/database";

function configureWebPush(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@cabrader.app";

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export interface BroadcastPushOptions {
  title: string;
  body: string;
  url?: string;
  excludeUserId?: string;
}

export async function broadcastPushToDrivers(
  supabase: SupabaseClient,
  options: BroadcastPushOptions
): Promise<number> {
  if (!configureWebPush()) return 0;

  let query = supabase.from("push_subscriptions").select("*");
  if (options.excludeUserId) {
    query = query.neq("user_id", options.excludeUserId);
  }

  const { data: subs } = await query;
  if (!subs?.length) return 0;

  const payload = JSON.stringify({
    title: options.title,
    body: options.body,
    url: options.url ?? "/",
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

  return sent;
}

interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

interface ProfilePresenceRow {
  id: string;
  push_enabled: boolean;
  last_known_latitude: number | null;
  last_known_longitude: number | null;
  last_known_at: string | null;
}

/** Push to nearby drivers only — never the affected driver. No PII in payload. */
export async function sendNearbyEmergencyPush(
  supabase: SupabaseClient,
  alert: Pick<
    DriverAlert,
    | "id"
    | "created_by"
    | "latitude"
    | "longitude"
    | "emergency_last_latitude"
    | "emergency_last_longitude"
  >
): Promise<number> {
  if (!configureWebPush()) return 0;

  const coords = emergencyAlertCoordinates(alert);
  if (!coords) return 0;

  const { data: subs } = await supabase.from("push_subscriptions").select("*");
  if (!subs?.length) return 0;

  const userIds = [
    ...new Set(
      subs
        .map((s) => s.user_id as string)
        .filter((id) => id && id !== alert.created_by)
    ),
  ];

  if (userIds.length === 0) return 0;

  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id, push_enabled, last_known_latitude, last_known_longitude, last_known_at"
    )
    .in("id", userIds);

  const nearbyUserIds = new Set(
    (profiles ?? [])
      .filter((row): row is ProfilePresenceRow => {
        if (!row.push_enabled) return false;
        if (row.last_known_latitude == null || row.last_known_longitude == null) {
          return false;
        }
        if (!isPresenceFresh(row.last_known_at)) return false;
        return isWithinEmergencyNotifyRadius(
          coords.lat,
          coords.lng,
          row.last_known_latitude,
          row.last_known_longitude
        );
      })
      .map((row) => row.id)
  );

  if (nearbyUserIds.size === 0) return 0;

  const payload = JSON.stringify({
    kind: "taxi_emergency",
    title: PUBLIC_EMERGENCY_PUSH_TITLE,
    body: PUBLIC_EMERGENCY_PUSH_BODY,
    url: emergencyAwarenessPath(alert.id),
    alertId: alert.id,
    actions: [
      { action: "view", title: "📍 Visa plats" },
      { action: "dismiss", title: "✖ Stäng" },
    ],
  });

  let sent = 0;
  await Promise.all(
    (subs as PushSubscriptionRow[]).map(async (sub) => {
      if (!nearbyUserIds.has(sub.user_id)) return;

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

  return sent;
}
