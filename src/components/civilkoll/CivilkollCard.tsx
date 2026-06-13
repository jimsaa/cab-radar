"use client";

import { useState } from "react";
import { useAppToast } from "@/components/ui/AppToast";
import { normalizeRegistrationNumber } from "@/lib/civilkoll";
import { recordDriverActivityFromDevice } from "@/lib/driver-activity-client";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; found: boolean }
  | { status: "error"; message: string };

function CivilkollResultCard({ found }: { found: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-5 py-6 text-center",
        found
          ? "border-success/50 bg-success/[0.06] shadow-[0_0_28px_rgba(52,211,153,0.12)]"
          : "border-zinc-500/35 bg-card/80"
      )}
    >
      <div className="mx-auto flex flex-col items-center gap-3">
        {found ? (
          <CheckCircle2
            className="h-9 w-9 text-success"
            strokeWidth={2.25}
            aria-hidden
          />
        ) : (
          <Circle
            className="h-9 w-9 text-zinc-400"
            strokeWidth={2}
            aria-hidden
          />
        )}

        <p
          className={cn(
            "text-2xl font-black tracking-tight",
            found ? "text-success" : "text-zinc-300"
          )}
        >
          {found ? "🟢 KÄND CIVIL" : "⚪ EJ KÄND"}
        </p>

        <p className="max-w-xs text-sm leading-relaxed text-foreground/90">
          {found
            ? "Finns i CabRadars observationsregister."
            : "Inga observationer finns registrerade."}
        </p>

        <p className="max-w-xs text-xs leading-relaxed text-muted">
          {found
            ? "Var uppmärksam och gör alltid en egen bedömning."
            : "Du kan anmäla fordonet för granskning nedan."}
        </p>
      </div>
    </div>
  );
}

export function CivilkollCard() {
  const showToast = useAppToast();
  const [registration, setRegistration] = useState("");
  const [lookup, setLookup] = useState<LookupState>({ status: "idle" });
  const [reportComment, setReportComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const normalized = normalizeRegistrationNumber(registration);
  const canLookup = normalized.length >= 2 && lookup.status !== "loading";
  const hasResult = lookup.status === "done";
  const noMatch = hasResult && !lookup.found;

  async function handleLookup() {
    if (!canLookup) return;
    setLookup({ status: "loading" });

    try {
      const res = await fetch("/api/civilkoll/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationNumber: registration }),
      });
      const data = (await res.json()) as {
        found?: boolean;
        error?: string;
      };

      if (!res.ok) {
        setLookup({
          status: "error",
          message: data.error ?? "Kunde inte söka.",
        });
        return;
      }

      setLookup({
        status: "done",
        found: Boolean(data.found),
      });
      void recordDriverActivityFromDevice("civilkoll_lookup");
    } catch {
      setLookup({ status: "error", message: "Nätverksfel. Försök igen." });
    }
  }

  async function handleSubmitReport() {
    if (!normalized || normalized.length < 2) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/civilkoll/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationNumber: registration,
          comment: reportComment,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        isTest?: boolean;
        message?: string;
      };

      if (!res.ok) {
        showToast(data.error ?? "Kunde inte skicka anmälan.", {
          variant: "error",
        });
        return;
      }

      setReportComment("");
      showToast(
        data.isTest
          ? "✓ Testanmälan skickad"
          : "✓ Registreringsnummer sparat"
      );
      void recordDriverActivityFromDevice("civilkoll_submit");
    } catch {
      showToast("⚠️ Kunde inte skicka anmälan", { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
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
        onChange={(e) => {
          setRegistration(e.target.value);
          if (lookup.status === "done" || lookup.status === "error") {
            setLookup({ status: "idle" });
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") void handleLookup();
        }}
        className="field mt-1.5 text-lg font-semibold tracking-wide uppercase"
      />

      <button
        type="button"
        onClick={() => void handleLookup()}
        disabled={!canLookup}
        className="btn-primary mt-4 w-full !min-h-[52px] text-base font-bold disabled:opacity-40"
      >
        {lookup.status === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          "Kolla"
        )}
      </button>

      {lookup.status === "error" && (
        <p className="mt-3 text-sm text-muted">{lookup.message}</p>
      )}

      {hasResult && (
        <div className="mt-6 space-y-4">
          <CivilkollResultCard found={lookup.found} />

          {noMatch && (
            <div className="rounded-2xl border border-card-border bg-background/40 p-4">
              <p className="text-sm font-medium text-foreground">
                Anmäl fordon för granskning
              </p>
              <label htmlFor="civilkoll-comment" className="sr-only">
                Kommentar
              </label>
              <textarea
                id="civilkoll-comment"
                rows={2}
                placeholder="Kommentar (valfritt)"
                value={reportComment}
                onChange={(e) => setReportComment(e.target.value)}
                className="field mt-2 min-h-[72px] resize-none text-sm"
              />
              <button
                type="button"
                onClick={() => void handleSubmitReport()}
                disabled={submitting}
                className="btn-secondary mt-3 w-full !min-h-[44px] text-sm disabled:opacity-50"
              >
                {submitting ? "Skickar…" : "Skicka"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
