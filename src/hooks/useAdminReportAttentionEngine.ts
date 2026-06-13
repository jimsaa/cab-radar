"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AdminCommandCenterSnapshot } from "@/lib/admin-command-center";
import {
  playAdminEmergencyAlert,
  playAdminReportTick,
} from "@/lib/admin-attention-sounds";
import {
  ADMIN_BG_FLASH_MS,
  ADMIN_HIGHLIGHT_MS,
  ADMIN_NY_BADGE_MS,
  adminReportAttentionStyle,
  loadAcknowledgedEmergencyIds,
  loadAlertedReportIds,
  persistAcknowledgedEmergencyIds,
  persistAlertedReportIds,
  type ReportAttentionVisual,
} from "@/lib/admin-report-attention";

interface AttentionEntry {
  showNyBadge: boolean;
  showBgFlash: boolean;
  showHighlight: boolean;
}

function emptyAttention(): ReportAttentionVisual {
  return {
    borderClass: "",
    pulseClass: "",
    showNyBadge: false,
    showAkutBadge: false,
    showBgFlash: false,
    isEmergencyUnacknowledged: false,
  };
}

export function useAdminReportAttentionEngine(
  snapshot: AdminCommandCenterSnapshot | null,
  chimeEnabled: boolean
) {
  const [attentionById, setAttentionById] = useState<Map<string, AttentionEntry>>(
    () => new Map()
  );
  const [unacknowledgedEmergencyIds, setUnacknowledgedEmergencyIds] = useState<
    Set<string>
  >(() => new Set());

  const knownReportIds = useRef<Set<string>>(new Set());
  const knownEmergencyIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);
  const attentionTimers = useRef<Map<string, number[]>>(new Map());

  const clearAttentionTimers = useCallback((id: string) => {
    const timers = attentionTimers.current.get(id);
    if (!timers) return;
    for (const timer of timers) window.clearTimeout(timer);
    attentionTimers.current.delete(id);
  }, []);

  const scheduleAttentionClear = useCallback(
    (id: string, patch: Partial<AttentionEntry>, delayMs: number) => {
      const timer = window.setTimeout(() => {
        setAttentionById((prev) => {
          const next = new Map(prev);
          const current = next.get(id);
          if (!current) return prev;
          next.set(id, { ...current, ...patch });
          return next;
        });
      }, delayMs);

      const existing = attentionTimers.current.get(id) ?? [];
      existing.push(timer);
      attentionTimers.current.set(id, existing);
    },
    []
  );

  const triggerFeedAttention = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;

      setAttentionById((prev) => {
        const next = new Map(prev);
        for (const id of ids) {
          clearAttentionTimers(id);
          next.set(id, {
            showNyBadge: true,
            showBgFlash: true,
            showHighlight: true,
          });

          scheduleAttentionClear(
            id,
            { showHighlight: false },
            ADMIN_HIGHLIGHT_MS
          );
          scheduleAttentionClear(id, { showBgFlash: false }, ADMIN_BG_FLASH_MS);
          scheduleAttentionClear(id, { showNyBadge: false }, ADMIN_NY_BADGE_MS);
        }
        return next;
      });
    },
    [clearAttentionTimers, scheduleAttentionClear]
  );

  useEffect(() => {
    if (!snapshot) return;

    const feedIds = snapshot.liveFeed.map((item) => item.id);
    const emergencyIds = snapshot.emergencies.map((item) => item.id);
    const alertedIds = loadAlertedReportIds();
    const ackedEmergencies = loadAcknowledgedEmergencyIds();

    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      for (const id of [...feedIds, ...emergencyIds]) {
        knownReportIds.current.add(id);
        alertedIds.add(id);
      }
      persistAlertedReportIds(alertedIds);
      knownEmergencyIds.current = new Set(emergencyIds);

      const unacked = emergencyIds.filter((id) => !ackedEmergencies.has(id));
      setUnacknowledgedEmergencyIds(new Set(unacked));
      return;
    }

    const brandNewFeed: string[] = [];
    for (const id of feedIds) {
      if (!knownReportIds.current.has(id)) {
        knownReportIds.current.add(id);
        if (!alertedIds.has(id)) {
          brandNewFeed.push(id);
          alertedIds.add(id);
        }
      }
    }

    const brandNewEmergencies: string[] = [];
    for (const id of emergencyIds) {
      if (!knownEmergencyIds.current.has(id)) {
        brandNewEmergencies.push(id);
      }
      if (!knownReportIds.current.has(id)) {
        knownReportIds.current.add(id);
        alertedIds.add(id);
      }
    }

    knownEmergencyIds.current = new Set(emergencyIds);
    persistAlertedReportIds(alertedIds);

    if (brandNewFeed.length > 0) {
      triggerFeedAttention(brandNewFeed);
      if (chimeEnabled) playAdminReportTick();
    }

    if (brandNewEmergencies.length > 0) {
      if (chimeEnabled) playAdminEmergencyAlert();
      setUnacknowledgedEmergencyIds((prev) => {
        const next = new Set(prev);
        for (const id of brandNewEmergencies) {
          if (!ackedEmergencies.has(id)) next.add(id);
        }
        return next;
      });
    }

    setUnacknowledgedEmergencyIds(() => {
      const activeUnacked = emergencyIds.filter(
        (id) => !ackedEmergencies.has(id)
      );
      return new Set(activeUnacked);
    });
  }, [snapshot, chimeEnabled, triggerFeedAttention]);

  const acknowledgeEmergency = useCallback((id: string) => {
    const acked = loadAcknowledgedEmergencyIds();
    acked.add(id);
    persistAcknowledgedEmergencyIds(acked);
    setUnacknowledgedEmergencyIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const clearEmergencyAcknowledgement = useCallback((id: string) => {
    const acked = loadAcknowledgedEmergencyIds();
    acked.delete(id);
    persistAcknowledgedEmergencyIds(acked);
  }, []);

  const getReportAttention = useCallback(
    (id: string, type: string): ReportAttentionVisual => {
      const entry = attentionById.get(id);
      const style = adminReportAttentionStyle(type);
      const isEmergency = type === "taxi_emergency";
      const isEmergencyUnacknowledged =
        isEmergency && unacknowledgedEmergencyIds.has(id);

      if (!entry && !isEmergencyUnacknowledged) {
        return emptyAttention();
      }

      return {
        borderClass: isEmergencyUnacknowledged ? style.borderClass : "",
        pulseClass:
          entry?.showHighlight || isEmergencyUnacknowledged
            ? style.pulseClass
            : "",
        showNyBadge: Boolean(entry?.showNyBadge),
        showAkutBadge: isEmergencyUnacknowledged,
        showBgFlash: Boolean(entry?.showBgFlash),
        isEmergencyUnacknowledged,
      };
    },
    [attentionById, unacknowledgedEmergencyIds]
  );

  return {
    getReportAttention,
    acknowledgeEmergency,
    clearEmergencyAcknowledgement,
    unacknowledgedEmergencyIds,
  };
}
