"use client";

import { useMemo } from "react";
import { Download } from "lucide-react";
import { waitlistToCsv, type WaitlistEntry } from "@/lib/waitlist";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("sv-SE", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function AdminWaitlistTable({
  entries: initialEntries,
}: {
  entries: WaitlistEntry[];
}) {
  const entries = initialEntries;

  const csv = useMemo(() => waitlistToCsv(entries), [entries]);

  function downloadCsv() {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cabrader-waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {entries.length} e-postadress{entries.length === 1 ? "" : "er"} (
          coming_soon)
        </p>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={downloadCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-card-border bg-card px-3 py-2 text-xs font-semibold"
          >
            <Download className="h-4 w-4" />
            Exportera CSV
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted">Ingen har anmält sig ännu.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-card-border bg-card px-4 py-3"
            >
              <span className="min-w-0 truncate text-sm font-medium">
                {entry.email}
              </span>
              <span className="shrink-0 text-xs text-muted">
                {formatDate(entry.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
