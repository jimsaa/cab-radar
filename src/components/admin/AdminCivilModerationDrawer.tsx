"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useAdminCommandCenter } from "@/contexts/AdminCommandCenterContext";
import type { CommandCenterCivilItem } from "@/lib/admin-command-center";
import { formatCivilDateTime } from "@/lib/civilkoll";
import { cn } from "@/lib/utils";

interface AdminCivilModerationDrawerProps {
  onClose: () => void;
}

function CivilSubmissionRow({
  item,
  busy,
  onApprove,
  onReject,
}: {
  item: CommandCenterCivilItem;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const submitter =
    item.submitter_display_name ??
    item.submitter_nickname ??
    "Okänd förare";

  return (
    <li
      className={cn(
        "rounded-[14px] border p-4",
        item.is_test
          ? "border-amber-500/30 bg-amber-500/[0.06]"
          : "border-[#3A4048] bg-[#1B1E22]/80"
      )}
    >
      {item.is_test && (
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-amber-300">
          🧪 Testläge
        </p>
      )}
      <p className="font-mono text-xl font-black tracking-wider text-white">
        {item.registration_number}
      </p>
      <div className="mt-2 space-y-0.5 text-sm text-[#B0B6BE]">
        <p>
          <span className="text-[#8A9099]">Inskickad av: </span>
          {submitter}
        </p>
        {item.submitter_nickname &&
          item.submitter_display_name &&
          item.submitter_nickname !== item.submitter_display_name && (
            <p className="text-xs text-[#8A9099]">
              Smeknamn: {item.submitter_nickname}
            </p>
          )}
        <p>
          <span className="text-[#8A9099]">Datum: </span>
          {formatCivilDateTime(item.created_at)}
        </p>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onApprove}
          className="flex-1 rounded-[10px] bg-[#22C55E]/20 py-2.5 text-xs font-bold text-[#22C55E] disabled:opacity-50"
        >
          ✅ Godkänn
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          className="flex-1 rounded-[10px] bg-[#FF3B30]/20 py-2.5 text-xs font-bold text-[#FF3B30] disabled:opacity-50"
        >
          ❌ Avvisa
        </button>
      </div>
    </li>
  );
}

export function AdminCivilModerationDrawer({
  onClose,
}: AdminCivilModerationDrawerProps) {
  const showToast = useAdminToast();
  const { snapshot, refresh } = useAdminCommandCenter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingCivil = snapshot?.pendingCivil ?? [];
  const testPendingCivil = snapshot?.testPendingCivil ?? [];
  const allPending = [...pendingCivil, ...testPendingCivil];

  async function review(submissionId: string, action: "approve" | "reject") {
    setBusyId(submissionId);
    try {
      const res = await fetch("/api/admin/civilkoll/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, action, adminNotes: "" }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        showToast(data.error ?? "Kunde inte granska.", { variant: "error" });
        return;
      }
      void refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-[#3A4048] bg-[#1E2125] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-civil-moderation-title"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[#3A4048] px-5 py-4">
          <div>
            <h2
              id="admin-civil-moderation-title"
              className="text-lg font-bold text-white"
            >
              🔍 CivilKoll granskning
            </h2>
            <p className="mt-0.5 text-xs text-[#8A9099]">
              Anmälningar som väntar godkännande
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-[#8A9099] hover:bg-[#262B31] hover:text-white"
            aria-label="Stäng"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {allPending.length === 0 ? (
            <p className="text-sm text-[#8A9099]">
              Inga CivilKoll-anmälningar att granska.
            </p>
          ) : (
            <ul className="space-y-3">
              {allPending.map((item) => (
                <CivilSubmissionRow
                  key={item.id}
                  item={item}
                  busy={busyId === item.id}
                  onApprove={() => void review(item.id, "approve")}
                  onReject={() => void review(item.id, "reject")}
                />
              ))}
            </ul>
          )}
        </div>

        <footer className="shrink-0 border-t border-[#3A4048] p-4">
          <Link
            href="/admin/civilkoll"
            className="flex w-full items-center justify-center rounded-[12px] border border-[#3A4048] bg-[#262B31] px-4 py-3 text-sm font-semibold text-[#B0B6BE] hover:text-white"
          >
            Öppna fullständig CivilKoll →
          </Link>
        </footer>
      </div>
    </div>
  );
}
