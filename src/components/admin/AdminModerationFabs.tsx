"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AdminCivilModerationDrawer } from "@/components/admin/AdminCivilModerationDrawer";
import { AdminModerationFabButton } from "@/components/admin/AdminModerationFabButton";
import { AdminUserModerationDrawer } from "@/components/admin/AdminUserModerationDrawer";
import { useAdminCommandCenterOptional } from "@/contexts/AdminCommandCenterContext";

interface AdminModerationFabsProps {
  isFullAdmin: boolean;
}

/** Floating moderation shortcuts — visible on /admin without cluttering the layout. */
export function AdminModerationFabs({ isFullAdmin }: AdminModerationFabsProps) {
  const pathname = usePathname();
  const ctx = useAdminCommandCenterOptional();
  const [usersOpen, setUsersOpen] = useState(false);
  const [civilOpen, setCivilOpen] = useState(false);

  if (!isFullAdmin || pathname !== "/admin" || !ctx) {
    return null;
  }

  const { counts, snapshot } = ctx;
  const userBadge =
    counts.users + (snapshot?.testModeDrivers.length ?? 0);
  const civilBadge = counts.civilkoll;

  return (
    <>
      <div className="pointer-events-none fixed bottom-5 right-5 z-[115] flex flex-col items-end gap-3">
        <div className="pointer-events-auto flex flex-col items-end gap-3">
          <AdminModerationFabButton
            icon="👥"
            label="Användare"
            badgeCount={userBadge}
            accent="blue"
            onClick={() => setUsersOpen(true)}
          />
          <AdminModerationFabButton
            icon="🔍"
            label="CivilKoll"
            badgeCount={civilBadge}
            accent="purple"
            onClick={() => setCivilOpen(true)}
          />
        </div>
      </div>

      {usersOpen && (
        <AdminUserModerationDrawer onClose={() => setUsersOpen(false)} />
      )}
      {civilOpen && (
        <AdminCivilModerationDrawer onClose={() => setCivilOpen(false)} />
      )}
    </>
  );
}
