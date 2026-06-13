"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import {
  formatCivilkollObservedDate,
  isValidRegistrationNumber,
  normalizeRegistrationNumber,
} from "@/lib/civilkoll";
import { cn } from "@/lib/utils";

type LookupModal = {
  kind: "known" | "unknown";
  registrationNumber: string;
  lastVerifiedAt: string | null;
};

type AddModal = {
  kind: "created" | "exists";
  registrationNumber: string;
};

type ActiveModal =
  | { type: "lookup"; data: LookupModal }
  | { type: "add"; data: AddModal }
  | null;

interface AdminCivilkollActionsProps {
  variant?: "tesla" | "dashboard";
  className?: string;
  autoFocus?: boolean;
}

export function AdminCivilkollActions({
  variant = "tesla",
  className,
  autoFocus = variant === "tesla",
}: AdminCivilkollActionsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [registration, setRegistration] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [modal, setModal] = useState<ActiveModal>(null);

  const normalized = normalizeRegistrationNumber(registration);
  const canAct =
    isValidRegistrationNumber(normalized) && !lookupLoading && !addLoading;

  const focusInput = useCallback(() => {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModal(null);
    setRegistration("");
    focusInput();
  }, [focusInput]);

  useEffect(() => {
    if (autoFocus) focusInput();
  }, [autoFocus, focusInput]);

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

  async function handleLookup() {
    if (!canAct) {
      inputRef.current?.focus();
      return;
    }

    setLookupLoading(true);
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
        type: "lookup",
        data: {
          kind: data.found ? "known" : "unknown",
          registrationNumber: data.registrationNumber ?? normalized,
          lastVerifiedAt: data.lastVerifiedAt ?? null,
        },
      });
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleAdd() {
    if (!canAct) {
      inputRef.current?.focus();
      return;
    }

    setAddLoading(true);
    try {
      const res = await fetch("/api/admin/civilkoll/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationNumber: normalized }),
      });

      const data = (await res.json()) as {
        error?: string;
        status?: "created" | "exists";
        registrationNumber?: string;
      };

      if (!res.ok) {
        console.error("[CIVILKOLL ADD]", data.error ?? res.status);
        inputRef.current?.focus();
        return;
      }

      setModal({
        type: "add",
        data: {
          kind: data.status === "exists" ? "exists" : "created",
          registrationNumber: data.registrationNumber ?? normalized,
        },
      });
    } finally {
      setAddLoading(false);
    }
  }

  const isTesla = variant === "tesla";

  return (
    <>
      <div
        className={cn(
          isTesla
            ? "shrink-0 border-t border-[#3A4048] p-4"
            : "rounded-[18px] border border-card-border bg-card p-4",
          className
        )}
      >
        <h3
          className={cn(
            "mb-3 text-xs font-bold uppercase tracking-widest",
            isTesla ? "text-[#8A9099]" : "text-muted"
          )}
        >
          CivilKoll
        </h3>

        <div className="space-y-2">
          <input
            ref={inputRef}
            type="text"
            value={registration}
            onChange={(event) =>
              setRegistration(
                normalizeRegistrationNumber(event.target.value).slice(0, 10)
              )
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleLookup();
            }}
            placeholder="ABC123"
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            disabled={lookupLoading || addLoading}
            className={cn(
              "w-full rounded-[14px] border px-4 py-3 text-lg font-bold uppercase tracking-wider focus:outline-none disabled:opacity-50",
              isTesla
                ? "border-[#3A4048] bg-[#1B1E22] text-white placeholder:font-normal placeholder:normal-case placeholder:text-[#8A9099] focus:border-[#4A5159]"
                : "field uppercase"
            )}
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void handleLookup()}
              disabled={!canAct}
              className={cn(
                "flex flex-1 items-center justify-center rounded-[14px] border px-4 py-3 text-base font-bold transition active:scale-[0.98] disabled:opacity-40",
                isTesla
                  ? "border-[#3B82F6]/50 bg-[#3B82F6]/20 text-white hover:bg-[#3B82F6]/30"
                  : "border-accent/40 bg-accent/15 text-foreground hover:bg-accent/25"
              )}
            >
              {lookupLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Kontrollera"
              )}
            </button>
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={!canAct}
              className={cn(
                "flex flex-1 items-center justify-center rounded-[14px] border px-4 py-3 text-base font-bold transition active:scale-[0.98] disabled:opacity-40",
                isTesla
                  ? "border-[#22C55E]/50 bg-[#22C55E]/15 text-white hover:bg-[#22C55E]/25"
                  : "border-success/40 bg-success/15 text-foreground hover:bg-success/25"
              )}
            >
              {addLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Lägg till"
              )}
            </button>
          </div>
        </div>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="civilkoll-modal-title"
        >
          {modal.type === "lookup" ? (
            <LookupResultModal
              data={modal.data}
              onClose={handleCloseModal}
            />
          ) : (
            <AddResultModal data={modal.data} onClose={handleCloseModal} />
          )}
        </div>
      )}
    </>
  );
}

function LookupResultModal({
  data,
  onClose,
}: {
  data: LookupModal;
  onClose: () => void;
}) {
  const isKnown = data.kind === "known";

  return (
    <div
      className={cn(
        "w-full max-w-md rounded-2xl border px-6 py-8 text-center shadow-2xl",
        isKnown
          ? "border-success/50 bg-success/[0.06] shadow-[0_0_28px_rgba(52,211,153,0.12)]"
          : "border-danger/50 bg-danger/[0.06] shadow-[0_0_28px_rgba(239,68,68,0.12)]"
      )}
    >
      <div className="mx-auto flex flex-col items-center gap-3">
        {isKnown ? (
          <CheckCircle2
            className="h-9 w-9 text-success"
            strokeWidth={2.25}
            aria-hidden
          />
        ) : (
          <Circle
            className="h-9 w-9 fill-danger text-danger"
            strokeWidth={0}
            aria-hidden
          />
        )}

        <h2
          id="civilkoll-modal-title"
          className={cn(
            "text-2xl font-black tracking-tight",
            isKnown ? "text-success" : "text-danger"
          )}
        >
          {isKnown ? "🟢 KÄND CIVIL" : "🔴 EJ KÄND"}
        </h2>

        <p className="text-lg leading-relaxed text-foreground">
          <span className="font-mono font-bold">{data.registrationNumber}</span>{" "}
          {isKnown
            ? "finns registrerad i CivilKoll."
            : "finns inte registrerad i CivilKoll."}
        </p>

        {isKnown && data.lastVerifiedAt && (
          <p className="text-sm text-muted">
            Senast verifierad:{" "}
            {formatCivilkollObservedDate(data.lastVerifiedAt)}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-[14px] border border-card-border bg-card px-6 py-4 text-lg font-bold text-foreground transition hover:bg-card/80 active:scale-[0.98]"
        >
          OK
        </button>
      </div>
    </div>
  );
}

function AddResultModal({
  data,
  onClose,
}: {
  data: AddModal;
  onClose: () => void;
}) {
  const isCreated = data.kind === "created";

  return (
    <div
      className={cn(
        "w-full max-w-md rounded-2xl border px-6 py-8 text-center shadow-2xl",
        isCreated
          ? "border-success/50 bg-success/[0.06] shadow-[0_0_28px_rgba(52,211,153,0.12)]"
          : "border-amber-400/50 bg-amber-400/[0.06] shadow-[0_0_28px_rgba(251,191,36,0.12)]"
      )}
    >
      <div className="mx-auto flex flex-col items-center gap-3">
        {isCreated ? (
          <CheckCircle2
            className="h-9 w-9 text-success"
            strokeWidth={2.25}
            aria-hidden
          />
        ) : (
          <Circle
            className="h-9 w-9 fill-amber-400 text-amber-400"
            strokeWidth={0}
            aria-hidden
          />
        )}

        <h2
          id="civilkoll-modal-title"
          className={cn(
            "text-2xl font-black tracking-tight",
            isCreated ? "text-success" : "text-amber-300"
          )}
        >
          {isCreated ? "🟢 CIVIL REGISTRERAD" : "🟡 FINNS REDAN"}
        </h2>

        <p className="text-lg leading-relaxed text-foreground">
          <span className="font-mono font-bold">{data.registrationNumber}</span>{" "}
          {isCreated
            ? "har lagts till i CivilKoll."
            : "finns redan registrerad."}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-[14px] border border-card-border bg-card px-6 py-4 text-lg font-bold text-foreground transition hover:bg-card/80 active:scale-[0.98]"
        >
          OK
        </button>
      </div>
    </div>
  );
}

/** @deprecated Use AdminCivilkollActions */
export function TeslaCivilkollLookup({
  className,
}: {
  className?: string;
}) {
  return <AdminCivilkollActions variant="tesla" className={className} />;
}
