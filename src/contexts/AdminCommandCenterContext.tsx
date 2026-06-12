"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ADMIN_REFRESH_INTERVAL_MS,
  formatAdminRefreshLabel,
  secondsSince,
  type AdminCommandCenterSnapshot,
} from "@/lib/admin-command-center";
import type { AdminBadgeCounts } from "@/lib/admin-notifications";
import { playAlertChime } from "@/lib/push";

const EMPTY_COUNTS: AdminBadgeCounts = {
  emergency: 0,
  alerts: 0,
  users: 0,
  feedback: 0,
  support: 0,
  partner: 0,
  civilkoll: 0,
};

interface AdminCommandCenterContextValue {
  snapshot: AdminCommandCenterSnapshot | null;
  lastUpdatedAt: number | null;
  refreshLabel: string;
  isRefreshing: boolean;
  newEmergencyIds: ReadonlySet<string>;
  refresh: () => Promise<void>;
  counts: AdminBadgeCounts;
}

const AdminCommandCenterContext =
  createContext<AdminCommandCenterContextValue | null>(null);

export function AdminCommandCenterProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [snapshot, setSnapshot] = useState<AdminCommandCenterSnapshot | null>(
    null
  );
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const [newEmergencyIds, setNewEmergencyIds] = useState<Set<string>>(
    () => new Set()
  );

  const knownEmergencyIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);
  const refreshInFlight = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setIsRefreshing(true);

    try {
      const res = await fetch("/api/admin/command-center-snapshot", {
        cache: "no-store",
      });
      if (!res.ok) return;

      const data = (await res.json()) as {
        ok?: boolean;
        snapshot?: AdminCommandCenterSnapshot;
      };
      if (!data.snapshot) return;

      const next = data.snapshot;
      const nextIds = new Set(next.emergencies.map((e) => e.id));
      const brandNew = new Set<string>();

      if (initialLoadDone.current) {
        for (const id of nextIds) {
          if (!knownEmergencyIds.current.has(id)) {
            brandNew.add(id);
          }
        }
        if (brandNew.size > 0 && next.alertChimeEnabled) {
          playAlertChime();
        }
      } else {
        initialLoadDone.current = true;
      }

      knownEmergencyIds.current = nextIds;
      setNewEmergencyIds(brandNew);
      setSnapshot(next);
      setLastUpdatedAt(Date.now());

      if (brandNew.size > 0) {
        window.setTimeout(() => {
          setNewEmergencyIds((prev) => {
            const cleared = new Set(prev);
            for (const id of brandNew) cleared.delete(id);
            return cleared;
          });
        }, 12_000);
      }
    } catch {
      // best-effort live refresh
    } finally {
      refreshInFlight.current = false;
      setIsRefreshing(false);
    }
  }, []);

  const scheduleRefresh = useCallback(
    (immediate = false) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
      if (immediate) {
        void refresh();
        return;
      }
      debounceTimer.current = setTimeout(() => {
        void refresh();
      }, 300);
    },
    [refresh]
  );

  useEffect(() => {
    void refresh();
    const poll = window.setInterval(
      () => void refresh(),
      ADMIN_REFRESH_INTERVAL_MS
    );
    return () => window.clearInterval(poll);
  }, [refresh]);

  useEffect(() => {
    const tickInterval = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(tickInterval);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const tables = [
      "driver_alerts",
      "profiles",
      "civil_submissions",
      "taxi_deals",
      "user_feedback",
      "support_messages",
      "partner_leads",
    ] as const;

    const channel = supabase.channel("admin_command_center");

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          const isEmergencyInsert =
            table === "driver_alerts" &&
            payload.eventType === "INSERT" &&
            (payload.new as { type?: string })?.type === "taxi_emergency";
          scheduleRefresh(isEmergencyInsert);
        }
      );
    }

    channel.subscribe();

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      supabase.removeChannel(channel);
    };
  }, [scheduleRefresh]);

  const refreshLabel = useMemo(() => {
    void tick;
    return formatAdminRefreshLabel(secondsSince(lastUpdatedAt));
  }, [lastUpdatedAt, tick]);

  const counts = snapshot?.counts ?? EMPTY_COUNTS;

  const value = useMemo(
    () => ({
      snapshot,
      lastUpdatedAt,
      refreshLabel,
      isRefreshing,
      newEmergencyIds,
      refresh,
      counts,
    }),
    [
      snapshot,
      lastUpdatedAt,
      refreshLabel,
      isRefreshing,
      newEmergencyIds,
      refresh,
      counts,
    ]
  );

  return (
    <AdminCommandCenterContext.Provider value={value}>
      {children}
    </AdminCommandCenterContext.Provider>
  );
}

export function useAdminCommandCenter(): AdminCommandCenterContextValue {
  const ctx = useContext(AdminCommandCenterContext);
  if (!ctx) {
    throw new Error(
      "useAdminCommandCenter must be used within AdminCommandCenterProvider"
    );
  }
  return ctx;
}

export function useAdminCommandCenterOptional():
  | AdminCommandCenterContextValue
  | null {
  return useContext(AdminCommandCenterContext);
}
