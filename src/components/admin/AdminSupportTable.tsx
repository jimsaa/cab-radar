"use client";

import type { SupportMessage } from "@/lib/types/database";
import { formatSwedishDateTime } from "@/lib/datetime";
import { AdminStatusList } from "./AdminStatusList";

export function AdminSupportTable({
  messages,
}: {
  messages: SupportMessage[];
}) {
  return (
    <AdminStatusList
      items={messages}
      table="support_messages"
      searchPlaceholder="Sök CabRadar User ID…"
      emptyMessage="Inga supportmeddelanden."
      searchFilter={(item, q) =>
        item.cabradar_user_id.toUpperCase().includes(q.toUpperCase()) ||
        (item.display_name?.toUpperCase().includes(q.toUpperCase()) ?? false) ||
        item.subject.toUpperCase().includes(q.toUpperCase())
      }
      renderHeader={(item) => (
        <>
          <p className="font-semibold leading-snug">{item.subject}</p>
          <p className="mt-1 text-xs text-muted">
            {item.cabradar_user_id}
            {item.display_name ? ` · ${item.display_name}` : ""}
          </p>
          <p className="mt-1 text-xs text-muted">
            {formatSwedishDateTime(item.created_at)} · v{item.app_version}
          </p>
        </>
      )}
      renderBody={(item) => (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.message}</p>
      )}
    />
  );
}
