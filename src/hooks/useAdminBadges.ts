"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAdminCommandCenterOptional } from "@/contexts/AdminCommandCenterContext";
import {
  ADMIN_HREF_BADGE,
  type AdminBadgeCounts,
  type AdminBadgeKey,
  hasAnyUnread,
  isBadgeUnread,
  readSeenCounts,
  writeSeenCounts,
} from "@/lib/admin-notifications";

const EMPTY_COUNTS: AdminBadgeCounts = {
  emergency: 0,
  alerts: 0,
  users: 0,
  feedback: 0,
  support: 0,
  partner: 0,
  civilkoll: 0,
};

export function useAdminBadges() {
  const pathname = usePathname();
  const commandCenter = useAdminCommandCenterOptional();
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [fallbackCounts, setFallbackCounts] =
    useState<AdminBadgeCounts>(EMPTY_COUNTS);
  const [seen, setSeen] = useState<Partial<AdminBadgeCounts>>({});

  const counts = commandCenter?.counts ?? fallbackCounts;
  const countsRef = useRef(counts);
  countsRef.current = counts;

  const refreshFallback = useCallback(async () => {
    if (commandCenter) return;
    try {
      const res = await fetch("/api/admin/badge-counts");
      if (!res.ok) return;
      const data = (await res.json()) as { counts: AdminBadgeCounts };
      setFallbackCounts(data.counts ?? EMPTY_COUNTS);
    } catch {
      // ignore
    }
  }, [commandCenter]);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setAdminUserId(user.id);
      setSeen(readSeenCounts(user.id));
      if (!commandCenter) {
        await refreshFallback();
      }
    }
    void init();
  }, [commandCenter, refreshFallback]);

  useEffect(() => {
    if (commandCenter) return;
    const interval = window.setInterval(refreshFallback, 30_000);
    return () => window.clearInterval(interval);
  }, [commandCenter, refreshFallback]);

  useEffect(() => {
    if (!adminUserId) return;

    const badgeKey = ADMIN_HREF_BADGE[pathname];
    if (!badgeKey) return;

    setSeen((prev) => {
      const next = { ...prev, [badgeKey]: countsRef.current[badgeKey] };
      writeSeenCounts(adminUserId, next);
      return next;
    });
  }, [pathname, adminUserId]);

  function isUnread(key: AdminBadgeKey): boolean {
    return isBadgeUnread(key, counts[key], seen);
  }

  function isOverviewUnread(): boolean {
    return hasAnyUnread(counts, seen);
  }

  function unreadCount(key: AdminBadgeKey): number {
    const lastSeen = seen[key] ?? 0;
    return Math.max(0, counts[key] - lastSeen);
  }

  return {
    counts,
    isUnread,
    isOverviewUnread,
    unreadCount,
    refresh: commandCenter?.refresh ?? refreshFallback,
  };
}

export { ADMIN_HREF_BADGE };
