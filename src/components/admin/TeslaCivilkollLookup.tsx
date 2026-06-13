"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  formatCivilkollObservedDate,
  isValidRegistrationNumber,
  normalizeRegistrationNumber,
} from "@/lib/civilkoll";
import { cn } from "@/lib/utils";

type LookupModal =
  | {
      kind: "known" | "unknown";
      registrationNumber: string;
      lastVerifiedAt: string | null;
    }
  | null;

interface TeslaCivilkollLookupProps {
  className?: string;
}

export function TeslaCivilkollLookup({ className }: TeslaCivilkollLookupProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [registration, setRegistration] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<LookupModal>(null);

  const focusInput = useCallback(() => {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModal(null);
    setRegistration("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    focusInput();
  }, [focusInput]);

  useEffect(() => {
    if (!modal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter") {
        handleCloseModal();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal, handleCloseModal]);

  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();

    const normalized = normalizeRegistrationNumber(registration);
    if (!isValidRegistrationNumber(normalized)) {
      inputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/civilkoll/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationNumber: normalized }),
      });

      const data = (await res.json()) as {
        error?: string;
        found?: boolean;
        registrationNumber?: string;
        lastVerifiedAt?: string | null;
      };

      if (!res.ok) {
        console.error("[CIVILKOLL LOOKUP]", data.error ?? res.status);
        inputRef.current?.focus();
        return;
      }

      setModal({
        kind: data.found ? "known" : "unknown",
        registrationNumber: data.registrationNumber ?? normalized,
        lastVerifiedAt: data.lastVerifiedAt ?? null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit =
    !submitting &&
    isValidRegistrationNumber(normalizeRegistrationNumber(registration));

  return (
    <>
      <div
        className={cn(
          "shrink-0 border-t border-[#3A4048] p-4",
          className
        )}
      >
        <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-[#8A9099]">
          🔍 Civilkoll
        </h3>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="flex w-full gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={registration}
            onChange={(event) =>
              setRegistration(
                normalizeRegistrationNumber(event.target.value).slice(0, 10)
              )
            }
            placeholder="ABC123"
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            disabled={submitting}
            className="min-w-0 flex-1 rounded-[14px] border border-[#3A4048] bg-[#1B1E22] px-4 py-4 text-lg font-bold uppercase tracking-wider text-white placeholder:font-normal placeholder:normal-case placeholder:text-[#8A9099] focus:border-[#4A5159] focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "shrink-0 rounded-[14px] border border-[#3B82F6]/50 bg-[#3B82F6]/20 px-5 py-4 text-base font-bold text-white transition hover:bg-[#3B82F6]/30 active:scale-[0.98] disabled:opacity-40"
            )}
          >
            {submitting ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              "Kontrollera"
            )}
          </button>
        </form>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="civilkoll-result-title"
        >
          <div className="w-full max-w-md rounded-[20px] border border-[#3A4048] bg-[#262B31] px-6 py-8 text-center shadow-2xl">
            <h2
              id="civilkoll-result-title"
              className={cn(
                "text-2xl font-black tracking-tight",
                modal.kind === "known" ? "text-[#F4C430]" : "text-[#B0B6BE]"
              )}
            >
              {modal.kind === "known" ? "⚠️ KÄND CIVIL" : "🔍 EJ KÄND"}
            </h2>

            <p className="mt-4 text-lg leading-relaxed text-white">
              <span className="font-mono font-bold">{modal.registrationNumber}</span>{" "}
              {modal.kind === "known"
                ? "finns registrerad i CivilKoll."
                : "finns inte registrerad i CivilKoll."}
            </p>

            {modal.kind === "known" && modal.lastVerifiedAt && (
              <p className="mt-3 text-sm text-[#8A9099]">
                Senast verifierad:{" "}
                {formatCivilkollObservedDate(modal.lastVerifiedAt)}
              </p>
            )}

            <button
              type="button"
              onClick={handleCloseModal}
              className="mt-8 w-full rounded-[14px] border border-[#3A4048] bg-[#1B1E22] px-6 py-4 text-lg font-bold text-white transition hover:border-[#4A5159] hover:bg-[#323840] active:scale-[0.98]"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
