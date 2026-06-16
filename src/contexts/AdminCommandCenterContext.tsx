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
import type { ReportAttentionVisual } from "@/lib/admin-report-attention";
import { useAdminReportAttentionEngine } from "@/hooks/useAdminReportAttentionEngine";

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
  /** @deprecated Use unacknowledgedEmergencyIds */
  newEmergencyIds: ReadonlySet<string>;
  refresh: () => Promise<void>;
  counts: AdminBadgeCounts;
  getReportAttention: (id: string, type: string) => ReportAttentionVisual;
  acknowledgeEmergency: (id: string) => void;
  clearEmergencyAcknowledgement: (id: string) => void;
  unacknowledgedEmergencyIds: ReadonlySet<string>;
}

const AdminCommandCenterContext =
  createContext<AdminCommandCenterContextValue | null>(null);

export function AdminCommandCenterProvider({
  children,
  snapshotUrl = "/api/admin/command-center-snapshot",
}: {
  children: React.ReactNode;
  snapshotUrl?: string;
}) {
  const [snapshot, setSnapshot] = useState<AdminCommandCenterSnapshot | null>(
    null
  );
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tick, setTick] = useState(0);

  const refreshInFlight = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chimeEnabled = snapshot?.alertChimeEnabled !== false;

  const {
    getReportAttention,
    acknowledgeEmergency,
    clearEmergencyAcknowledgement,
    unacknowledgedEmergencyIds,
  } = useAdminReportAttentionEngine(snapshot, chimeEnabled);

  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return;
    refreshInFlight.current = true;
    setIsRefreshing(true);

    try {
      const res = await fetch(snapshotUrl, {
        cache: "no-store",
      });
      if (!res.ok) return;

      const data = (await res.json()) as {
        ok?: boolean;
        snapshot?: AdminCommandCenterSnapshot;
      };
      if (!data.snapshot) return;

      setSnapshot(data.snapshot);
      setLastUpdatedAt(Date.now());
    } catch {
      // best-effort live refresh
    } finally {
      refreshInFlight.current = false;
      setIsRefreshing(false);
    }
  }, [snapshotUrl]);

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
      newEmergencyIds: unacknowledgedEmergencyIds,
      refresh,
      counts,
      getReportAttention,
      acknowledgeEmergency,
      clearEmergencyAcknowledgement,
      unacknowledgedEmergencyIds,
    }),
    [
      snapshot,
      lastUpdatedAt,
      refreshLabel,
      isRefreshing,
      unacknowledgedEmergencyIds,
      refresh,
      counts,
      getReportAttention,
      acknowledgeEmergency,
      clearEmergencyAcknowledgement,
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
