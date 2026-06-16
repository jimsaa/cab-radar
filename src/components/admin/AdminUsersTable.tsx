"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { AdminUserEditor } from "@/components/admin/AdminUserEditor";
import {
  adminUserStatusBadges,
} from "@/lib/admin-user-editor";
import { adminDriverRealName, publicDriverLabel } from "@/lib/driver-display";
import { VERIFICATION_STATUS_LABELS } from "@/lib/verification";
import { maskLicenceLast4 } from "@/lib/licence.shared";
import type { Profile } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface AdminUsersTableProps {
  users: Profile[];
  isAdmin: boolean;
}

export function AdminUsersTable({ users: initialUsers, isAdmin }: AdminUsersTableProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState(initialUsers);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;

    return users.filter((u) => {
      const idMatch = u.cabradar_user_id?.toLowerCase().includes(q);
      const nameMatch =
        u.nickname?.toLowerCase().includes(q) ||
        u.display_name?.toLowerCase().includes(q);
      const masked = maskLicenceLast4(u.driver_license_last4).toLowerCase();
      const last4Match = u.driver_license_last4?.includes(q.replace(/^xx/i, ""));
      const maskedMatch = masked.includes(q);
      return idMatch || nameMatch || last4Match || maskedMatch;
    });
  }, [users, query]);

  const pendingCount = users.filter(
    (u) => u.verification_status === "pending_verification" && !u.is_admin
  ).length;

  const selectedProfile = selectedUserId
    ? users.find((u) => u.id === selectedUserId) ?? null
    : null;

  function handleSaved(updated: Profile) {
    setUsers((prev) =>
      prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u))
    );
  }

  return (
    <div className="space-y-4">
      {!isAdmin && (
        <p className="rounded-2xl border border-danger/30 bg-danger/10 px-5 py-4 text-base text-danger">
          Du saknar behörighet att hantera användare.
        </p>
      )}

      {pendingCount > 0 && (
        <p className="rounded-2xl border border-accent/30 bg-accent/10 px-5 py-4 text-base">
          👤 {pendingCount} förare väntar godkännande — tryck för att granska
        </p>
      )}

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          className="field pl-12 text-lg"
          placeholder="Sök ID, namn eller XX1234…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Sök användare"
        />
      </div>

      <ul className="space-y-3">
        {filtered.length === 0 ? (
          <li className="rounded-2xl border border-card-border px-6 py-12 text-center text-lg text-muted">
            Inga träffar
          </li>
        ) : (
          filtered.map((u) => {
            const badges = adminUserStatusBadges(u);
            const realName = adminDriverRealName(u);

            return (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => setSelectedUserId(u.id)}
                  className="flex w-full items-center gap-4 rounded-2xl border border-[#3A4048] bg-[#1B1E22]/80 px-5 py-5 text-left transition-colors hover:border-[#42A5F5]/40 hover:bg-[#262B31] active:scale-[0.99]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xl font-bold text-white">
                      {publicDriverLabel(u)}
                    </p>
                    {realName && realName !== publicDriverLabel(u) && (
                      <p className="mt-0.5 truncate text-sm text-[#8A9099]">
                        {realName}
                      </p>
                    )}
                    <p className="mt-2 font-mono text-sm text-[#42A5F5]">
                      {u.cabradar_user_id ?? u.id.slice(0, 8)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-semibold",
                          u.verification_status === "verified"
                            ? "bg-success/15 text-success"
                            : u.verification_status === "pending_verification"
                              ? "bg-accent/15 text-accent-bright"
                              : "bg-danger/15 text-danger"
                        )}
                      >
                        {VERIFICATION_STATUS_LABELS[u.verification_status]}
                      </span>
                      {badges.slice(0, 3).map((badge) => (
                        <span
                          key={badge.label}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-semibold",
                            badge.className
                          )}
                        >
                          {badge.emoji} {badge.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 shrink-0 text-[#8A9099]" />
                </button>
              </li>
            );
          })
        )}
      </ul>

      {selectedUserId && (
        <AdminUserEditor
          userId={selectedUserId}
          initialProfile={selectedProfile}
          isAdmin={isAdmin}
          onClose={() => setSelectedUserId(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
