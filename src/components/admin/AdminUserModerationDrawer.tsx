"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, X } from "lucide-react";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useAdminCommandCenter } from "@/contexts/AdminCommandCenterContext";
import {
  formatCommandCenterDriverLabel,
  type CommandCenterPendingUser,
  type CommandCenterTestModeDriver,
} from "@/lib/admin-command-center";
import { adminDriverRealName } from "@/lib/driver-display";
import { formatRelativeSwedish } from "@/lib/datetime";

interface AdminUserModerationDrawerProps {
  onClose: () => void;
}

function PendingUserRow({
  user,
  busy,
  onApprove,
  onReject,
}: {
  user: CommandCenterPendingUser;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const phone = user.phone_number?.replace(/\s/g, "");
  const realName = adminDriverRealName(user);

  return (
    <li className="rounded-[14px] border border-[#3A4048] bg-[#1B1E22]/80 p-4">
      <p className="text-base font-bold text-white">
        {formatCommandCenterDriverLabel(user)}
      </p>
      {realName && realName !== formatCommandCenterDriverLabel(user) && (
        <p className="mt-0.5 text-xs text-[#8A9099]">{realName}</p>
      )}
      <div className="mt-2 space-y-0.5 text-sm text-[#B0B6BE]">
        {user.phone_number && <p>📞 {user.phone_number}</p>}
        {user.taxi_company_name && (
          <p>
            {user.taxi_company_name}
            {user.taxi_number ? ` · Taxi ${user.taxi_number}` : ""}
          </p>
        )}
        {user.driver_city && <p>📍 {user.driver_city}</p>}
        <p className="text-xs text-[#8A9099]">
          Registrerad {formatRelativeSwedish(user.created_at)}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {phone && (
          <a
            href={`tel:${phone}`}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#3A4048] bg-[#262B31] px-3 py-2 text-xs font-semibold text-white"
          >
            <Phone className="h-3.5 w-3.5" />
            Ring upp
          </a>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={onApprove}
          className="rounded-[10px] bg-[#22C55E]/20 px-3 py-2 text-xs font-bold text-[#22C55E] disabled:opacity-50"
        >
          ✅ Aktivera
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onReject}
          className="rounded-[10px] bg-[#FF3B30]/20 px-3 py-2 text-xs font-bold text-[#FF3B30] disabled:opacity-50"
        >
          ❌ Avvisa
        </button>
      </div>
    </li>
  );
}

function TestModeDriverRow({
  driver,
  busy,
  onDisable,
}: {
  driver: CommandCenterTestModeDriver;
  busy: boolean;
  onDisable: () => void;
}) {
  const realName = adminDriverRealName(driver);

  return (
    <li className="rounded-[14px] border border-amber-500/30 bg-amber-500/[0.06] p-3">
      <p className="font-semibold text-amber-100">
        {formatCommandCenterDriverLabel(driver)}
      </p>
      {realName && realName !== formatCommandCenterDriverLabel(driver) && (
        <p className="mt-0.5 text-xs text-amber-200/60">{realName}</p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={onDisable}
        className="mt-2 rounded-[10px] border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 disabled:opacity-50"
      >
        Stäng av testläge
      </button>
    </li>
  );
}

export function AdminUserModerationDrawer({
  onClose,
}: AdminUserModerationDrawerProps) {
  const showToast = useAdminToast();
  const { snapshot, refresh } = useAdminCommandCenter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingUsers = snapshot?.pendingUsers ?? [];
  const testModeDrivers = snapshot?.testModeDrivers ?? [];

  async function verifyDriver(driverId: string, action: "approve" | "reject") {
    setBusyId(driverId);
    try {
      const res = await fetch("/api/admin/verify-driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId, action }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        showToast(data.error ?? "Kunde inte uppdatera föraren.", {
          variant: "error",
        });
        return;
      }
      void refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function disableTestMode(driverId: string) {
    setBusyId(driverId);
    try {
      const res = await fetch("/api/admin/set-test-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId, testModeEnabled: false }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        showToast(data.error ?? "Kunde inte stänga av testläge.", {
          variant: "error",
        });
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
        aria-labelledby="admin-user-moderation-title"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[#3A4048] px-5 py-4">
          <div>
            <h2
              id="admin-user-moderation-title"
              className="text-lg font-bold text-white"
            >
              👥 Användarhantering
            </h2>
            <p className="mt-0.5 text-xs text-[#8A9099]">
              Verifiering och testläge
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

        <div className="min-h-0 flex-1 overflow-y-auto p-5 space-y-6">
          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#F4C430]">
              Nya förare väntar ({pendingUsers.length})
            </h3>
            <ul className="mt-3 space-y-3">
              {pendingUsers.length === 0 ? (
                <li className="text-sm text-[#8A9099]">Inga väntande förare</li>
              ) : (
                pendingUsers.map((u) => (
                  <PendingUserRow
                    key={u.id}
                    user={u}
                    busy={busyId === u.id}
                    onApprove={() => void verifyDriver(u.id, "approve")}
                    onReject={() => void verifyDriver(u.id, "reject")}
                  />
                ))
              )}
            </ul>
          </section>

          <section>
            <h3 className="text-xs font-bold uppercase tracking-widest text-amber-300">
              Förare i testläge ({testModeDrivers.length})
            </h3>
            <ul className="mt-3 space-y-2">
              {testModeDrivers.length === 0 ? (
                <li className="text-sm text-amber-200/60">
                  Inga förare i testläge
                </li>
              ) : (
                testModeDrivers.map((driver) => (
                  <TestModeDriverRow
                    key={driver.id}
                    driver={driver}
                    busy={busyId === driver.id}
                    onDisable={() => void disableTestMode(driver.id)}
                  />
                ))
              )}
            </ul>
          </section>
        </div>

        <footer className="shrink-0 border-t border-[#3A4048] p-4">
          <Link
            href="/admin/users"
            className="flex w-full items-center justify-center rounded-[12px] border border-[#3A4048] bg-[#262B31] px-4 py-3 text-sm font-semibold text-[#B0B6BE] hover:text-white"
          >
            Öppna fullständig användarlista →
          </Link>
        </footer>
      </div>
    </div>
  );
}
