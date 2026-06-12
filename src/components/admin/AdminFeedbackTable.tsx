"use client";

import type { UserFeedback } from "@/lib/types/database";
import { formatSwedishDateTime } from "@/lib/datetime";
import { AdminStatusList } from "./AdminStatusList";

export function AdminFeedbackTable({
  feedback,
}: {
  feedback: UserFeedback[];
}) {
  return (
    <AdminStatusList
      items={feedback}
      table="user_feedback"
      searchPlaceholder="Sök ämne eller användar-ID…"
      emptyMessage="Ingen feedback ännu."
      searchFilter={(item, q) => {
        const upper = q.toUpperCase();
        return (
          item.subject.toUpperCase().includes(upper) ||
          (item.cabradar_user_id?.toUpperCase().includes(upper) ?? false) ||
          (item.display_name?.toUpperCase().includes(upper) ?? false)
        );
      }}
      renderHeader={(item) => (
        <>
          <p className="font-semibold leading-snug">{item.subject}</p>
          <p className="mt-1 text-xs text-muted">
            {item.cabradar_user_id ?? "Gäst"}
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
