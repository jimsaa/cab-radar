"use client";

import type { ValidationResponse } from "@/lib/alert-validation";
import { cn } from "@/lib/utils";

interface AlertValidationPromptProps {
  promptText: string | null;
  visible: boolean;
  submitting: boolean;
  onRespond: (response: ValidationResponse) => void;
  onDismiss: () => void;
}

export function AlertValidationPrompt({
  promptText,
  visible,
  submitting,
  onRespond,
  onDismiss,
}: AlertValidationPromptProps) {
  if (!visible || !promptText) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Bekräfta varning"
      className={cn(
        "fixed left-4 right-4 z-50",
        "bottom-[calc(env(safe-area-inset-bottom)+8.5rem)]"
      )}
    >
      <div className="rounded-2xl border border-card-border bg-card/95 p-3 shadow-lg backdrop-blur-md">
        <p className="text-sm font-medium leading-snug">{promptText}</p>
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => onRespond("yes")}
            className="flex-1 rounded-xl bg-success/15 py-2.5 text-sm font-semibold text-success active:scale-[0.98] disabled:opacity-50"
          >
            Ja
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => onRespond("no")}
            className="flex-1 rounded-xl bg-danger/15 py-2.5 text-sm font-semibold text-danger active:scale-[0.98] disabled:opacity-50"
          >
            Nej
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => onRespond("unknown")}
            className="flex-1 rounded-xl bg-muted/15 py-2.5 text-sm font-semibold text-muted active:scale-[0.98] disabled:opacity-50"
          >
            Vet inte
          </button>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-1.5 w-full py-1 text-xs text-muted/70"
          aria-label="Stäng"
        >
          Stäng
        </button>
      </div>
    </div>
  );
}
