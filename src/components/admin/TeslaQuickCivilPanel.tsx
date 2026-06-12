"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  isValidRegistrationNumber,
  normalizeRegistrationNumber,
} from "@/lib/civilkoll";
import { cn } from "@/lib/utils";

const TOAST_MS = 3000;

type ToastState = {
  kind: "success" | "info";
  message: string;
  detail?: string;
};

interface TeslaQuickCivilPanelProps {
  onAdded?: () => void;
}

export function TeslaQuickCivilPanel({ onAdded }: TeslaQuickCivilPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [registration, setRegistration] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(id);
  }, [toast]);

  const showToast = useCallback((next: ToastState) => {
    setToast(next);
  }, []);

  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();

    const normalized = normalizeRegistrationNumber(registration);
    if (!isValidRegistrationNumber(normalized)) {
      showToast({
        kind: "info",
        message: "Ogiltigt registreringsnummer",
      });
      inputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/civilkoll/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationNumber: normalized }),
      });

      const data = (await res.json()) as {
        error?: string;
        status?: "created" | "exists";
        message?: string;
        lastObservedLabel?: string | null;
      };

      if (!res.ok) {
        showToast({
          kind: "info",
          message: data.error ?? "Kunde inte spara.",
        });
        inputRef.current?.focus();
        return;
      }

      setRegistration("");

      if (data.status === "exists") {
        showToast({
          kind: "info",
          message: "ℹ️ Finns redan i Civilkoll",
          detail: data.lastObservedLabel
            ? `Senast rapporterad: ${data.lastObservedLabel}`
            : undefined,
        });
      } else {
        showToast({
          kind: "success",
          message: "✅ Registreringsnummer tillagt",
        });
        onAdded?.();
      }

      inputRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="shrink-0 border-t border-[#3A4048] p-3">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[#8A9099]">
        🔍 Snabb Civil
      </h3>

      {toast && (
        <div
          className={cn(
            "mb-2 rounded-[12px] px-3 py-2 text-xs font-semibold leading-snug",
            toast.kind === "success"
              ? "bg-[#22C55E]/15 text-[#22C55E]"
              : "bg-[#3B82F6]/15 text-[#93C5FD]"
          )}
          role="status"
        >
          {toast.message}
          {toast.detail && (
            <p className="mt-0.5 font-normal opacity-80">{toast.detail}</p>
          )}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={registration}
          onChange={(event) =>
            setRegistration(
              normalizeRegistrationNumber(event.target.value).slice(0, 10)
            )
          }
          placeholder="T.ex. ABC123"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={submitting}
          className="min-w-0 flex-1 rounded-[12px] border border-[#3A4048] bg-[#1B1E22] px-3 py-2.5 text-sm font-semibold uppercase tracking-wide text-white placeholder:normal-case placeholder:font-normal placeholder:text-[#8A9099] focus:border-[#4A5159] focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={submitting || registration.trim().length < 2}
          className="shrink-0 rounded-[12px] border border-[#3A4048] bg-[#262B31] px-3 py-2.5 text-sm font-bold text-white transition hover:border-[#4A5159] hover:bg-[#2a3038] active:scale-[0.98] disabled:opacity-40"
        >
          {submitting ? "…" : "Lägg till"}
        </button>
      </form>
    </div>
  );
}
