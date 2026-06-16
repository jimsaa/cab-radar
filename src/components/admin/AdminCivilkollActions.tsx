"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useAdminCommandCenterOptional } from "@/contexts/AdminCommandCenterContext";
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
  message: string;
};

type ErrorModal = {
  message: string;
};

type ActiveModal =
  | { type: "lookup"; data: LookupModal }
  | { type: "add"; data: AddModal }
  | { type: "error"; data: ErrorModal }
  | null;

interface AdminCivilkollActionsProps {
  variant?: "tesla" | "dashboard";
  className?: string;
  autoFocus?: boolean;
  /** Tesla View — lookup only, no admin add flow. */
  lookupOnly?: boolean;
}

export function AdminCivilkollActions({
  variant = "tesla",
  className,
  autoFocus = variant === "tesla",
  lookupOnly = false,
}: AdminCivilkollActionsProps) {
  const showToast = useAdminToast();
  const commandCenter = useAdminCommandCenterOptional();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
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
    setMounted(true);
  }, []);

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
      const res = await fetch(
        lookupOnly ? "/api/civilkoll/lookup" : "/api/admin/civilkoll/lookup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrationNumber: normalized }),
        }
      );

      const data = (await res.json()) as {
        error?: string;
        found?: boolean;
        registrationNumber?: string;
        lastVerifiedAt?: string | null;
      };

      if (!res.ok) {
        const message = data.error ?? "Kunde inte söka i CivilKoll.";
        console.error("[CIVILKOLL LOOKUP]", message);
        showToast(message, { variant: "error" });
        setModal({ type: "error", data: { message } });
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
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Kunde inte söka i CivilKoll.";
      console.error("[CIVILKOLL LOOKUP]", err);
      showToast(message, { variant: "error" });
      setModal({ type: "error", data: { message } });
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleAdd() {
    console.log("Admin Civil Add:", normalized);

    if (!canAct) {
      if (!isValidRegistrationNumber(normalized)) {
        const message = "Ogiltigt registreringsnummer.";
        showToast(message, { variant: "error" });
        setModal({ type: "error", data: { message } });
      }
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
        message?: string;
        status?: "created" | "exists";
        registrationNumber?: string;
      };

      if (!res.ok) {
        const message = data.error ?? "Kunde inte lägga till i CivilKoll.";
        console.error("[CIVILKOLL ADD]", message, res.status);
        showToast(message, { variant: "error" });
        setModal({ type: "error", data: { message } });
        return;
      }

      const reg = data.registrationNumber ?? normalized;
      const isCreated = data.status !== "exists";
      const message =
        data.message ??
        (isCreated
          ? `✅ ${reg} har lagts till direkt i CivilKoll.`
          : `${reg} finns redan i CivilKoll.`);

      showToast(message, { variant: isCreated ? "success" : "info" });
      void commandCenter?.refresh();

      setModal({
        type: "add",
        data: {
          kind: isCreated ? "created" : "exists",
          registrationNumber: reg,
          message,
        },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Kunde inte lägga till i CivilKoll.";
      console.error("[CIVILKOLL ADD]", err);
      showToast(message, { variant: "error" });
      setModal({ type: "error", data: { message } });
    } finally {
      setAddLoading(false);
    }
  }

  const isTesla = variant === "tesla";

  const modalContent =
    modal &&
    (modal.type === "lookup" ? (
      <LookupResultModal data={modal.data} onClose={handleCloseModal} isTesla={isTesla} />
    ) : modal.type === "add" ? (
      <AddResultModal data={modal.data} onClose={handleCloseModal} isTesla={isTesla} />
    ) : (
      <ErrorResultModal data={modal.data} onClose={handleCloseModal} isTesla={isTesla} />
    ));

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
              if (event.key === "Enter") {
                if (event.shiftKey && !lookupOnly) {
                  void handleAdd();
                } else {
                  void handleLookup();
                }
              }
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

          <div className={lookupOnly ? "space-y-2" : "flex gap-2"}>
            <button
              type="button"
              onClick={() => void handleLookup()}
              disabled={!canAct}
              className={cn(
                "flex items-center justify-center rounded-[14px] border px-4 py-3 text-base font-bold transition active:scale-[0.98] disabled:opacity-40",
                lookupOnly ? "w-full" : "flex-1",
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
            {!lookupOnly && (
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
            )}
          </div>
        </div>
      </div>

      {mounted &&
        modalContent &&
        createPortal(
          <div
            className="fixed inset-0 z-[650] flex items-center justify-center bg-black/75 p-4"
            role="dialog"
            aria-modal="true"
            onClick={handleCloseModal}
          >
            <div onClick={(event) => event.stopPropagation()}>{modalContent}</div>
          </div>,
          document.body
        )}
    </>
  );
}

function modalShellClass(isTesla: boolean, tone: "success" | "warn" | "error" | "neutral") {
  if (!isTesla) {
    return cn(
      "w-full max-w-md rounded-2xl border px-6 py-8 text-center shadow-2xl",
      tone === "success" && "border-success/50 bg-success/[0.06]",
      tone === "warn" && "border-amber-400/50 bg-amber-400/[0.06]",
      tone === "error" && "border-danger/50 bg-danger/[0.06]",
      tone === "neutral" && "border-card-border bg-card"
    );
  }

  return cn(
    "w-full max-w-md rounded-[18px] border px-6 py-8 text-center shadow-2xl",
    tone === "success" && "border-[#22C55E]/50 bg-[#262B31]",
    tone === "warn" && "border-amber-400/50 bg-[#262B31]",
    tone === "error" && "border-[#FF3B30]/50 bg-[#262B31]",
    tone === "neutral" && "border-[#3A4048] bg-[#262B31]"
  );
}

function LookupResultModal({
  data,
  onClose,
  isTesla,
}: {
  data: LookupModal;
  onClose: () => void;
  isTesla: boolean;
}) {
  const isKnown = data.kind === "known";

  return (
    <div
      className={modalShellClass(isTesla, isKnown ? "success" : "error")}
      aria-labelledby="civilkoll-modal-title"
    >
      <div className="mx-auto flex flex-col items-center gap-3">
        {isKnown ? (
          <CheckCircle2
            className={cn("h-9 w-9", isTesla ? "text-[#22C55E]" : "text-success")}
            strokeWidth={2.25}
            aria-hidden
          />
        ) : (
          <Circle
            className={cn(
              "h-9 w-9 fill-current",
              isTesla ? "text-[#FF3B30]" : "text-danger"
            )}
            strokeWidth={0}
            aria-hidden
          />
        )}

        <h2
          id="civilkoll-modal-title"
          className={cn(
            "text-2xl font-black tracking-tight",
            isKnown
              ? isTesla
                ? "text-[#22C55E]"
                : "text-success"
              : isTesla
                ? "text-[#FF3B30]"
                : "text-danger"
          )}
        >
          {isKnown ? "🟢 KÄND CIVIL" : "🔴 EJ KÄND"}
        </h2>

        <p
          className={cn(
            "text-lg leading-relaxed",
            isTesla ? "text-[#B0B6BE]" : "text-foreground"
          )}
        >
          <span className="font-mono font-bold text-white">
            {data.registrationNumber}
          </span>{" "}
          {isKnown
            ? "finns registrerad i CivilKoll."
            : "finns inte registrerad i CivilKoll."}
        </p>

        {isKnown && data.lastVerifiedAt && (
          <p className={cn("text-sm", isTesla ? "text-[#8A9099]" : "text-muted")}>
            Senast verifierad:{" "}
            {formatCivilkollObservedDate(data.lastVerifiedAt)}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className={cn(
            "mt-4 w-full rounded-[14px] border px-6 py-4 text-lg font-bold transition active:scale-[0.98]",
            isTesla
              ? "border-[#3A4048] bg-[#1B1E22] text-white hover:bg-[#2a3038]"
              : "border-card-border bg-card text-foreground hover:bg-card/80"
          )}
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
  isTesla,
}: {
  data: AddModal;
  onClose: () => void;
  isTesla: boolean;
}) {
  const isCreated = data.kind === "created";

  return (
    <div
      className={modalShellClass(isTesla, isCreated ? "success" : "warn")}
      aria-labelledby="civilkoll-modal-title"
    >
      <div className="mx-auto flex flex-col items-center gap-3">
        {isCreated ? (
          <CheckCircle2
            className={cn("h-9 w-9", isTesla ? "text-[#22C55E]" : "text-success")}
            strokeWidth={2.25}
            aria-hidden
          />
        ) : (
          <Circle
            className={cn(
              "h-9 w-9 fill-current",
              isTesla ? "text-amber-400" : "text-amber-400"
            )}
            strokeWidth={0}
            aria-hidden
          />
        )}

        <h2
          id="civilkoll-modal-title"
          className={cn(
            "text-2xl font-black tracking-tight",
            isCreated
              ? isTesla
                ? "text-[#22C55E]"
                : "text-success"
              : isTesla
                ? "text-amber-300"
                : "text-amber-300"
          )}
        >
          {isCreated ? "🟢 CIVIL REGISTRERAD" : "🟡 FINNS REDAN"}
        </h2>

        <p
          className={cn(
            "text-lg leading-relaxed",
            isTesla ? "text-[#B0B6BE]" : "text-foreground"
          )}
        >
          {data.message}
        </p>

        <button
          type="button"
          onClick={onClose}
          className={cn(
            "mt-4 w-full rounded-[14px] border px-6 py-4 text-lg font-bold transition active:scale-[0.98]",
            isTesla
              ? "border-[#3A4048] bg-[#1B1E22] text-white hover:bg-[#2a3038]"
              : "border-card-border bg-card text-foreground hover:bg-card/80"
          )}
        >
          OK
        </button>
      </div>
    </div>
  );
}

function ErrorResultModal({
  data,
  onClose,
  isTesla,
}: {
  data: ErrorModal;
  onClose: () => void;
  isTesla: boolean;
}) {
  return (
    <div
      className={modalShellClass(isTesla, "error")}
      aria-labelledby="civilkoll-error-title"
    >
      <div className="mx-auto flex flex-col items-center gap-3">
        <Circle
          className={cn(
            "h-9 w-9 fill-current",
            isTesla ? "text-[#FF3B30]" : "text-danger"
          )}
          strokeWidth={0}
          aria-hidden
        />
        <h2
          id="civilkoll-error-title"
          className={cn(
            "text-2xl font-black tracking-tight",
            isTesla ? "text-[#FF3B30]" : "text-danger"
          )}
        >
          Kunde inte spara
        </h2>
        <p
          className={cn(
            "text-base leading-relaxed",
            isTesla ? "text-[#B0B6BE]" : "text-foreground"
          )}
        >
          {data.message}
        </p>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "mt-4 w-full rounded-[14px] border px-6 py-4 text-lg font-bold transition active:scale-[0.98]",
            isTesla
              ? "border-[#3A4048] bg-[#1B1E22] text-white hover:bg-[#2a3038]"
              : "border-card-border bg-card text-foreground hover:bg-card/80"
          )}
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
