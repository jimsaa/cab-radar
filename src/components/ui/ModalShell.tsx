"use client";

import { useCallback, useEffect, useRef } from "react";

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  titleId: string;
  children: React.ReactNode;
}

export function ModalShell({
  open,
  onClose,
  titleId,
  children,
}: ModalShellProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] w-full max-w-md overflow-y-auto rounded-2xl border border-card-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalActions({
  onCancel,
  loading,
  submitLabel = "Skicka",
}: {
  onCancel: () => void;
  loading: boolean;
  submitLabel?: string;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="btn-secondary flex-1"
      >
        Avbryt
      </button>
      <button type="submit" disabled={loading} className="btn-primary flex-1">
        {loading ? "Skickar…" : submitLabel}
      </button>
    </div>
  );
}

export function ModalSuccess({ message }: { message: string }) {
  return (
    <div className="py-4 text-center">
      <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-success">
        {message}
      </p>
    </div>
  );
}

export function useAutoClose(onClose: () => void, active: boolean, ms = 3000) {
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(onClose, ms);
    return () => clearTimeout(timer);
  }, [active, onClose, ms]);
}
