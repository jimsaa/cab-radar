"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DriverAlert } from "@/lib/types/database";
import {
  VALIDATION_PASS_RADIUS_M,
  VALIDATION_PROMPT_DISMISS_MS,
  VALIDATION_PROMPT_MAX_M,
  VALIDATION_PROMPT_MIN_M,
  isValidationEligibleType,
  validationPromptForType,
  type ValidationResponse,
} from "@/lib/alert-validation";
import { fetchUserValidatedAlertIds } from "@/lib/alert-validation-api";
import { distanceMeters } from "@/lib/geo";
import { watchPosition } from "@/lib/geolocation";
import { createClient } from "@/lib/supabase/client";

interface UseAlertValidationPromptOptions {
  alerts: DriverAlert[];
  userId: string | null;
  enabled: boolean;
  onAlertUpdated?: (alert: DriverAlert) => void;
}

function promptedStorageKey(userId: string) {
  return `cabradar_prompted_alerts_${userId}`;
}

function loadPromptedAlertIds(userId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(promptedStorageKey(userId));
    return new Set(JSON.parse(raw ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

function persistPromptedAlertId(userId: string, alertId: string) {
  const ids = loadPromptedAlertIds(userId);
  ids.add(alertId);
  localStorage.setItem(promptedStorageKey(userId), JSON.stringify([...ids]));
}

export function useAlertValidationPrompt({
  alerts,
  userId,
  enabled,
  onAlertUpdated,
}: UseAlertValidationPromptOptions) {
  const [pendingAlert, setPendingAlert] = useState<DriverAlert | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passedNearRef = useRef<Set<string>>(new Set());
  const promptedRef = useRef<Set<string>>(new Set());
  const validatedRef = useRef<Set<string>>(new Set());
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const dismissPrompt = useCallback(() => {
    if (pendingAlert && userId) {
      promptedRef.current.add(pendingAlert.id);
      persistPromptedAlertId(userId, pendingAlert.id);
    }
    clearDismissTimer();
    setPendingAlert(null);
  }, [pendingAlert, userId, clearDismissTimer]);

  useEffect(() => {
    if (!userId || !enabled) return;

    promptedRef.current = loadPromptedAlertIds(userId);

    const supabase = createClient();
    fetchUserValidatedAlertIds(supabase, userId).then((ids) => {
      validatedRef.current = ids;
      for (const id of ids) {
        promptedRef.current.add(id);
      }
    });
  }, [userId, enabled]);

  useEffect(() => {
    if (!enabled || !userId || pendingAlert) return;

    const activeWithGps = alerts.filter(
      (a) =>
        isValidationEligibleType(a.type) &&
        a.status === "active" &&
        a.latitude != null &&
        a.longitude != null &&
        a.validation_status !== "resolved" &&
        !validatedRef.current.has(a.id) &&
        !promptedRef.current.has(a.id)
    );

    if (activeWithGps.length === 0) return;

    const stopWatch = watchPosition((pos) => {
      for (const alert of activeWithGps) {
        if (promptedRef.current.has(alert.id)) continue;
        if (validatedRef.current.has(alert.id)) continue;

        const dist = distanceMeters(
          pos.latitude,
          pos.longitude,
          alert.latitude!,
          alert.longitude!
        );

        if (dist <= VALIDATION_PASS_RADIUS_M) {
          passedNearRef.current.add(alert.id);
        }

        if (
          passedNearRef.current.has(alert.id) &&
          dist >= VALIDATION_PROMPT_MIN_M &&
          dist <= VALIDATION_PROMPT_MAX_M
        ) {
          setPendingAlert(alert);
          break;
        }
      }
    });

    return stopWatch;
  }, [alerts, enabled, userId, pendingAlert]);

  useEffect(() => {
    if (!pendingAlert) return;

    clearDismissTimer();
    dismissTimerRef.current = setTimeout(dismissPrompt, VALIDATION_PROMPT_DISMISS_MS);

    return clearDismissTimer;
  }, [pendingAlert, dismissPrompt, clearDismissTimer]);

  const respond = useCallback(
    async (response: ValidationResponse) => {
      if (!pendingAlert || submitting) return;

      setSubmitting(true);
      clearDismissTimer();

      const alertId = pendingAlert.id;
      const res = await fetch("/api/alerts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId, response }),
      });
      const data = await res.json();

      validatedRef.current.add(alertId);
      promptedRef.current.add(alertId);
      if (userId) persistPromptedAlertId(userId, alertId);
      setPendingAlert(null);
      setSubmitting(false);

      if (res.ok && data.alert) {
        onAlertUpdated?.(data.alert as DriverAlert);
      }
    },
    [pendingAlert, submitting, clearDismissTimer, onAlertUpdated, userId]
  );

  return {
    pendingAlert,
    promptText: pendingAlert ? validationPromptForType(pendingAlert.type) : null,
    submitting,
    respond,
    dismiss: dismissPrompt,
  };
}
