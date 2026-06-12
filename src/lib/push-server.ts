import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

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
