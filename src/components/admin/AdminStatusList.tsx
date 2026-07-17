"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { MessageStatus } from "@/lib/types/database";
import { FEEDBACK_STATUS_LABELS } from "@/lib/feedback-constants";
import { cn } from "@/lib/utils";

const FILTER_OPTIONS: Array<MessageStatus | "all"> = [
  "all",
  "ny",
  "behandlas",
  "klar",
];

export const PARTNER_STATUS_LABELS: Record<MessageStatus, string> = {
  ny: "New",
  behandlas: "Contacted",
  klar: "Closed",
};

interface AdminStatusListProps<T extends { id: string; status: MessageStatus; created_at: string }> {
  items: T[];
  table: string;
  searchPlaceholder: string;
  searchFilter: (item: T, query: string) => boolean;
  renderHeader: (item: T) => React.ReactNode;
  renderBody: (item: T) => React.ReactNode;
  emptyMessage?: string;
  statusLabels?: Record<MessageStatus, string>;
  markContactedLabel?: string;
  markClosedLabel?: string;
}

export function AdminStatusList<T extends { id: string; status: MessageStatus; created_at: string }>({
  items,
  table,
  searchPlaceholder,
  searchFilter,
  renderHeader,
  renderBody,
  emptyMessage = "Inga poster hittades.",
  statusLabels = FEEDBACK_STATUS_LABELS,
  markContactedLabel = "Markera behandlas",
  markClosedLabel = "Markera klar",
}: AdminStatusListProps<T>) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<MessageStatus | "all">("all");
  const [search, setSearch] = useState("");

  const filterLabels: Record<MessageStatus | "all", string> = {
    all: "Alla",
    ...statusLabels,
  };

  const filtered = useMemo(() => {
    const q = search.trim();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (q && !searchFilter(item, q)) return false;
      return true;
    });
  }, [items, statusFilter, search, searchFilter]);

  async function setStatus(id: string, status: MessageStatus) {
    const supabase = createClient();
    await supabase.from(table).update({ status }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <input
        className="field"
        type="search"
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStatusFilter(option)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              statusFilter === option
                ? "bg-accent text-white"
                : "bg-card border border-card-border text-muted"
            )}
          >
            {filterLabels[option]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">{emptyMessage}</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-card-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">{renderHeader(item)}</div>
                <StatusBadge status={item.status} labels={statusLabels} />
              </div>
              <div className="mt-3">{renderBody(item)}</div>
              {item.status !== "klar" && (
                <div className="mt-3 flex gap-2">
                  {item.status === "ny" && (
                    <button
                      type="button"
                      onClick={() => setStatus(item.id, "behandlas")}
                      className="btn-secondary flex-1 !min-h-[36px] !py-2 text-xs"
                    >
                      {markContactedLabel}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setStatus(item.id, "klar")}
                    className="btn-secondary flex-1 !min-h-[36px] !py-2 text-xs"
                  >
                    {markClosedLabel}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({
  status,
  labels,
}: {
  status: MessageStatus;
  labels: Record<MessageStatus, string>;
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
        status === "ny"
          ? "bg-accent/15 text-accent-bright"
          : status === "behandlas"
            ? "bg-info/15 text-info"
            : "bg-success/15 text-success"
      )}
    >
      {labels[status]}
    </span>
  );
}
