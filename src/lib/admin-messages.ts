import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ADMIN_MESSAGE_HISTORY_LIMIT,
  ADMIN_MESSAGE_MAX_LENGTH,
  ADMIN_MESSAGE_SENDER_LABEL,
  type ActiveDriverOption,
  type AdminMessageHistoryItem,
  type AdminMessageRecipientType,
  type DriverInboxMessage,
} from "./admin-messages.shared";
import { publicDriverLabel } from "./driver-display";
import { fetchActiveDriverNetwork } from "./driver-activity";
import { formatSwedishTime } from "./datetime";
import { broadcastPushToDrivers } from "./push-server";

export {
  ADMIN_MESSAGE_MAX_LENGTH,
  ADMIN_MESSAGE_HISTORY_LIMIT,
  ADMIN_MESSAGE_SENDER_LABEL,
  type ActiveDriverOption,
  type AdminMessageHistoryItem,
  type AdminMessageRecipientType,
  type DriverInboxMessage,
} from "./admin-messages.shared";

export interface AdminMessageRow {
  id: string;
  message: string;
  sender_admin_id: string;
  recipient_type: AdminMessageRecipientType;
  recipient_user_id: string | null;
  important: boolean;
  created_at: string;
}

function messagePreview(text: string, max = 48): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function formatAdminMessageTime(iso: string): string {
  return formatSwedishTime(iso);
}

export async function fetchActiveDriverOptions(
  supabase: SupabaseClient
): Promise<ActiveDriverOption[]> {
  const network = await fetchActiveDriverNetwork(supabase);
  const activeIds = network.activeDriverIds;

  if (activeIds.length === 0) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select("id, nickname, display_name, cabradar_user_id, driver_license_last4, taxi_number")
    .in("id", activeIds)
    .eq("verification_status", "verified")
    .eq("is_admin", false)
    .order("nickname", { ascending: true, nullsFirst: false });

  if (error) throw error;

  return (data ?? []).map((row) => {
    const label = publicDriverLabel(row);
    const taxiNumber = (row.taxi_number as string | null)?.trim() || null;
    const subtitle = taxiNumber ? `Taxi ${taxiNumber}` : "—";

    return {
      id: row.id as string,
      label,
      nickname: (row.nickname as string | null) ?? null,
      taxi_number: taxiNumber,
      subtitle,
    };
  });
}

async function resolveRecipientProfileLabel(
  supabase: SupabaseClient,
  userId: string | null
): Promise<string> {
  if (!userId) return "Alla aktiva";
  const { data } = await supabase
    .from("profiles")
    .select("nickname, display_name, cabradar_user_id, driver_license_last4, taxi_number")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return "Okänd förare";
  return publicDriverLabel(data);
}

export async function fetchAdminMessageHistory(
  supabase: SupabaseClient
): Promise<AdminMessageHistoryItem[]> {
  const { data, error } = await supabase
    .from("admin_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(ADMIN_MESSAGE_HISTORY_LIMIT);

  if (error) throw error;

  const rows = (data ?? []) as AdminMessageRow[];
  const labels = new Map<string, string>();

  for (const row of rows) {
    if (row.recipient_type === "all") {
      labels.set(row.id, "Alla aktiva");
    } else if (row.recipient_user_id) {
      labels.set(
        row.id,
        await resolveRecipientProfileLabel(supabase, row.recipient_user_id)
      );
    }
  }

  return rows.map((row) => ({
    id: row.id,
    message: row.message,
    recipient_type: row.recipient_type,
    recipient_label: labels.get(row.id) ?? "Alla aktiva",
    important: row.important,
    created_at: row.created_at,
    time_label: formatAdminMessageTime(row.created_at),
    preview: messagePreview(row.message),
  }));
}

export interface SendAdminMessageInput {
  message: string;
  recipientType: AdminMessageRecipientType;
  recipientUserId?: string | null;
  important?: boolean;
  senderAdminId: string;
}

export async function sendAdminMessage(
  supabase: SupabaseClient,
  input: SendAdminMessageInput
): Promise<{ messageId: string; recipientCount: number }> {
  const message = input.message.trim();
  if (!message || message.length > ADMIN_MESSAGE_MAX_LENGTH) {
    throw new Error("Meddelandet måste vara 1–300 tecken.");
  }

  let recipientIds: string[] = [];

  if (input.recipientType === "user") {
    const userId = input.recipientUserId?.trim();
    if (!userId) throw new Error("Välj en mottagare.");
    recipientIds = [userId];
  } else {
    const network = await fetchActiveDriverNetwork(supabase);
    recipientIds = network.activeDriverIds;
    if (recipientIds.length === 0) {
      throw new Error("Inga aktiva förare just nu.");
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("admin_messages")
    .insert({
      message,
      sender_admin_id: input.senderAdminId,
      recipient_type: input.recipientType,
      recipient_user_id:
        input.recipientType === "user" ? input.recipientUserId ?? null : null,
      important: Boolean(input.important),
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw insertError ?? new Error("Kunde inte spara meddelandet.");
  }

  const messageId = inserted.id as string;

  const deliveries = recipientIds.map((userId) => ({
    message_id: messageId,
    user_id: userId,
  }));

  const { error: deliveryError } = await supabase
    .from("admin_message_deliveries")
    .insert(deliveries);

  if (deliveryError) throw deliveryError;

  await sendAdminMessagePush(supabase, {
    recipientIds,
    message,
    important: Boolean(input.important),
    excludeUserId: input.senderAdminId,
  });

  return { messageId, recipientCount: recipientIds.length };
}

async function sendAdminMessagePush(
  supabase: SupabaseClient,
  options: {
    recipientIds: string[];
    message: string;
    important: boolean;
    excludeUserId: string;
  }
): Promise<void> {
  try {
    const title = options.important
      ? "⚠️ Viktigt — CabRadar Admin"
      : ADMIN_MESSAGE_SENDER_LABEL;

    await broadcastPushToDrivers(supabase, {
      title,
      body: options.message,
      url: "/",
      excludeUserId: options.excludeUserId,
      userIds: options.recipientIds,
    });
  } catch (err) {
    console.warn("[ADMIN MSG] push delivery skipped:", err);
  }
}

export async function fetchDriverInboxMessages(
  supabase: SupabaseClient,
  userId: string
): Promise<DriverInboxMessage[]> {
  const { data, error } = await supabase
    .from("admin_message_deliveries")
    .select(
      `
      id,
      message_id,
      created_at,
      admin_messages (
        message,
        important,
        created_at
      )
    `
    )
    .eq("user_id", userId)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const msg = row.admin_messages as
        | {
            message: string;
            important: boolean;
            created_at: string;
          }
        | {
            message: string;
            important: boolean;
            created_at: string;
          }[]
        | null;

      const payload = Array.isArray(msg) ? msg[0] : msg;
      if (!payload) return null;

      return {
        delivery_id: row.id as string,
        message_id: row.message_id as string,
        message: payload.message,
        important: Boolean(payload.important),
        sender_label: ADMIN_MESSAGE_SENDER_LABEL,
        created_at: payload.created_at,
        time_label: formatAdminMessageTime(payload.created_at),
      };
    })
    .filter((item): item is DriverInboxMessage => item != null);
}

export async function dismissDriverInboxMessage(
  supabase: SupabaseClient,
  userId: string,
  deliveryId: string
): Promise<void> {
  const { error } = await supabase
    .from("admin_message_deliveries")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", deliveryId)
    .eq("user_id", userId);

  if (error) throw error;
}
