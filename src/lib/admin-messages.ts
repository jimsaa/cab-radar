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

import { fetchActiveAlerts } from "./alerts";

import { formatSwedishTime } from "./datetime";

import { publicDriverLabel } from "./driver-display";

import {
  auditAllActiveMessageRecipients,
  logAdminMessageRecipientAudit,
} from "./admin-message-recipient-audit";
import { fetchActiveDriverNetwork } from "./driver-activity";

import {

  filterAlertsForDriverFeed,

  getOwnActiveEmergency,

} from "./emergency-driver";

export {

  ADMIN_MESSAGE_MAX_LENGTH,

  ADMIN_MESSAGE_HISTORY_LIMIT,

  ADMIN_MESSAGE_POLL_MS,

  ADMIN_MESSAGE_SENDER_LABEL,

  ADMIN_MESSAGE_BANNER_TITLE,

  type ActiveDriverOption,

  type AdminMessageHistoryItem,

  type AdminMessageRecipientType,

  type DriverInboxMessage,

  type DriverInboxResponse,

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



interface MessageReadRow {

  message_id: string;

  read_at: string | null;

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



async function fetchMessageReadStats(

  supabase: SupabaseClient,

  messageIds: string[]

): Promise<Map<string, { read_count: number; total_recipients: number }>> {

  const stats = new Map<string, { read_count: number; total_recipients: number }>();

  if (messageIds.length === 0) return stats;



  const { data, error } = await supabase

    .from("message_reads")

    .select("message_id, read_at")

    .in("message_id", messageIds);



  if (error) throw error;



  for (const row of (data ?? []) as MessageReadRow[]) {

    const current = stats.get(row.message_id) ?? {

      read_count: 0,

      total_recipients: 0,

    };

    current.total_recipients += 1;

    if (row.read_at) current.read_count += 1;

    stats.set(row.message_id, current);

  }



  return stats;

}



export async function fetchAdminMessageHistory(

  supabase: SupabaseClient

): Promise<AdminMessageHistoryItem[]> {

  const { data, error } = await supabase

    .from("messages")

    .select("*")

    .order("created_at", { ascending: false })

    .limit(ADMIN_MESSAGE_HISTORY_LIMIT);



  if (error) throw error;



  const rows = (data ?? []) as AdminMessageRow[];

  const readStats = await fetchMessageReadStats(

    supabase,

    rows.map((row) => row.id)

  );

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



  return rows.map((row) => {

    const stats = readStats.get(row.id) ?? {

      read_count: 0,

      total_recipients: 0,

    };



    return {

      id: row.id,

      message: row.message,

      recipient_type: row.recipient_type,

      recipient_label: labels.get(row.id) ?? "Alla aktiva",

      important: row.important,

      created_at: row.created_at,

      time_label: formatAdminMessageTime(row.created_at),

      preview: messagePreview(row.message),

      read_count: stats.read_count,

      total_recipients: stats.total_recipients,

      unread_count: stats.total_recipients - stats.read_count,

    };

  });

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

    const audit = await auditAllActiveMessageRecipients(
      supabase,
      recipientIds
    );
    logAdminMessageRecipientAudit(message, audit);

    if (recipientIds.length === 0) {

      throw new Error("Inga aktiva förare just nu.");

    }

  }



  const { data: inserted, error: insertError } = await supabase

    .from("messages")

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



  const reads = recipientIds.map((userId) => ({

    message_id: messageId,

    user_id: userId,

  }));



  const { error: readError } = await supabase.from("message_reads").insert(reads);



  if (readError) throw readError;

  console.info("[ADMIN MSG] message_reads inserted", {
    messageId,
    recipientCount: recipientIds.length,
    recipientIds,
  });

  return { messageId, recipientCount: recipientIds.length };

}



async function driverHasBlockingEmergency(

  supabase: SupabaseClient,

  userId: string

): Promise<boolean> {

  const { data: profile } = await supabase

    .from("profiles")

    .select("driver_city, show_national_emergencies, is_admin")

    .eq("id", userId)

    .maybeSingle();



  const alerts = await fetchActiveAlerts(supabase);



  if (getOwnActiveEmergency(alerts, userId)) return true;



  const filtered = filterAlertsForDriverFeed(alerts, userId, profile

    ? {

        driverCity: profile.driver_city,

        showNationalEmergencies: profile.show_national_emergencies ?? false,

        isAdmin: profile.is_admin ?? false,

      }

    : undefined);



  return filtered.some(

    (alert) =>

      alert.type === "taxi_emergency" &&

      alert.status === "active" &&

      !alert.is_test

  );

}



export async function fetchDriverUnreadMessage(

  supabase: SupabaseClient,

  userId: string

): Promise<{ message: DriverInboxMessage | null; blockForEmergency: boolean }> {

  const blockForEmergency = await driverHasBlockingEmergency(supabase, userId);

  if (blockForEmergency) {

    return { message: null, blockForEmergency: true };

  }



  const { data, error } = await supabase

    .from("message_reads")

    .select(

      `

      id,

      message_id,

      created_at,

      messages (

        message,

        important,

        created_at

      )

    `

    )

    .eq("user_id", userId)

    .is("read_at", null)

    .order("created_at", { ascending: true })

    .limit(1)

    .maybeSingle();



  if (error) throw error;

  if (!data) return { message: null, blockForEmergency: false };



  const msg = data.messages as

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

  if (!payload) return { message: null, blockForEmergency: false };



  return {

    blockForEmergency: false,

    message: {

      read_id: data.id as string,

      message_id: data.message_id as string,

      message: payload.message,

      important: Boolean(payload.important),

      sender_label: ADMIN_MESSAGE_SENDER_LABEL,

      created_at: payload.created_at,

      time_label: formatAdminMessageTime(payload.created_at),

    },

  };

}



export async function markDriverMessageRead(

  supabase: SupabaseClient,

  userId: string,

  readId: string

): Promise<void> {

  const { error } = await supabase

    .from("message_reads")

    .update({ read_at: new Date().toISOString() })

    .eq("id", readId)

    .eq("user_id", userId)

    .is("read_at", null);



  if (error) throw error;

}

