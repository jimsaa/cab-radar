"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppToast } from "@/components/ui/AppToast";
import {
  isValidRegistrationNumber,
  normalizeRegistrationNumber,
} from "@/lib/civilkoll";
import { recordDriverActivityFromDevice } from "@/lib/driver-activity-client";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

type UserModal =
  | { kind: "known"; registrationNumber: string }
  | { kind: "unknown"; registrationNumber: string }
  | null;

export function CivilkollCard() {
  const showToast = useAppToast();
  const [registration, setRegistration] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<UserModal>(null);

  const normalized = normalizeRegistrationNumber(registration);
  const canLookup =
    isValidRegistrationNumber(normalized) && !loading && !submitting;

  const resetForm = useCallback(() => {
    setModal(null);
    setRegistration("");
  }, []);

  useEffect(() => {
    if (!modal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && modal.kind === "known") {
        resetForm();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modal, resetForm]);

  async function handleLookup() {
    if (!canLookup) return;
    setLoading(true);

    try {
      const res = await fetch("/api/civilkoll/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationNumber: normalized }),
      });
      const data = (await res.json()) as {
        found?: boolean;
        error?: string;
      };

      if (!res.ok) {
        showToast(data.error ?? "Kunde inte söka.", { variant: "error" });
        return;
      }

      setModal({
        kind: data.found ? "known" : "unknown",
        registrationNumber: normalized,
      });
      void recordDriverActivityFromDevice("civilkoll_lookup");
    } catch {
      showToast("Nätverksfel. Försök igen.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitForReview() {
    if (!modal || modal.kind !== "unknown") return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/civilkoll/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationNumber: modal.registrationNumber,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        isTest?: boolean;
      };

      if (!res.ok) {
        showToast(data.error ?? "Kunde inte skicka anmälan.", {
          variant: "error",
        });
        return;
      }

      showToast(
        data.isTest
          ? "✓ Testanmälan skickad för granskning"
          : "✓ Registrering skickad för granskning"
      );
      void recordDriverActivityFromDevice("civilkoll_submit");
      resetForm();
    } catch {
      showToast("⚠️ Kunde inte skicka anmälan", { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-card-border bg-card p-5">
        <label htmlFor="civilkoll-reg" className="text-sm font-medium text-muted">
          Registreringsnummer
        </label>
        <input
          id="civilkoll-reg"
          type="text"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="ABC123"
          value={registration}
          onChange={(event) =>
            setRegistration(
              normalizeRegistrationNumber(event.target.value).slice(0, 10)
            )
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") void handleLookup();
          }}
          disabled={loading || submitting}
          className="field mt-1.5 text-lg font-semibold uppercase tracking-wide"
        />

        <button
          type="button"
          onClick={() => void handleLookup()}
          disabled={!canLookup}
          className="btn-primary mt-4 w-full !min-h-[52px] text-base font-bold disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "Kontrollera"
          )}
        </button>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-civilkoll-modal-title"
        >
          {modal.kind === "known" ? (
            <KnownResultModal onClose={resetForm} />
          ) : (
            <UnknownReviewModal
              registrationNumber={modal.registrationNumber}
              submitting={submitting}
              onSubmit={() => void handleSubmitForReview()}
              onCancel={resetForm}
            />
          )}
        </div>
      )}
    </>
  );
}

function KnownResultModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-success/50 bg-success/[0.06] px-6 py-8 text-center shadow-[0_0_28px_rgba(52,211,153,0.12)]">
      <div className="mx-auto flex flex-col items-center gap-3">
        <CheckCircle2
          className="h-9 w-9 text-success"
          strokeWidth={2.25}
          aria-hidden
        />
        <h2
          id="user-civilkoll-modal-title"
          className="text-2xl font-black tracking-tight text-success"
        >
          🟢 KÄND CIVIL
        </h2>
        <p className="max-w-xs text-sm leading-relaxed text-foreground/90">
          Finns i CabRadars observationsregister. Var uppmärksam och gör alltid
          en egen bedömning.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="btn-primary mt-4 w-full !min-h-[52px] text-base font-bold"
        >
          OK
        </button>
      </div>
    </div>
  );
}

function UnknownReviewModal({
  registrationNumber,
  submitting,
  onSubmit,
  onCancel,
}: {
  registrationNumber: string;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-danger/50 bg-danger/[0.06] px-6 py-8 text-center shadow-[0_0_28px_rgba(239,68,68,0.12)]">
      <div className="mx-auto flex flex-col items-center gap-3">
        <Circle
          className="h-9 w-9 fill-danger text-danger"
          strokeWidth={0}
          aria-hidden
        />
        <h2
          id="user-civilkoll-modal-title"
          className="text-2xl font-black tracking-tight text-danger"
        >
          🔴 EJ KÄND
        </h2>
        <p className="text-lg leading-relaxed text-foreground">
          <span className="font-mono font-bold">{registrationNumber}</span>{" "}
          finns inte registrerad.
        </p>
        <p className="max-w-xs text-sm leading-relaxed text-muted">
          Vill du skicka in denna registrering för granskning?
        </p>
        <div className="mt-2 flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="btn-primary w-full !min-h-[48px] text-base font-bold disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Skicka för granskning"
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className={cn(
              "btn-secondary w-full !min-h-[48px] text-base font-semibold disabled:opacity-50"
            )}
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}
