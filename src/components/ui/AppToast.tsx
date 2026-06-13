"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "info" | "error" | "emergency";

export interface ToastOptions {
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastState {
  id: number;
  message: string;
  variant: ToastVariant;
  durationMs: number;
}

const DEFAULT_DURATION_MS = 2000;
const EMERGENCY_DURATION_MS = 3500;

const AppToastContext = createContext<
  (message: string, options?: ToastOptions) => void
>(() => {});

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  success: "border-success/35 bg-[#1a2420] text-white",
  info: "border-[#3B82F6]/35 bg-[#1B1E22] text-white",
  error: "border-danger/45 bg-[#2a1515] text-white",
  emergency:
    "border-[#FF3B30]/55 bg-[#2a1010] text-white shadow-[0_0_28px_rgba(255,59,48,0.25)]",
};

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const variant = options?.variant ?? "success";
    const durationMs =
      options?.durationMs ??
      (variant === "emergency" ? EMERGENCY_DURATION_MS : DEFAULT_DURATION_MS);

    setToast({
      id: Date.now(),
      message,
      variant,
      durationMs,
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.durationMs);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <AppToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div
          className={cn(
            "app-toast-root pointer-events-none fixed inset-x-4 z-[500] mx-auto max-w-md rounded-2xl border px-4 py-3.5 text-center text-[15px] font-semibold leading-snug shadow-xl sm:text-base",
            toast.variant === "emergency" && "px-5 py-4 text-lg font-bold",
            VARIANT_CLASSES[toast.variant]
          )}
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)",
          }}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}
    </AppToastContext.Provider>
  );
}

export function useAppToast(): (
  message: string,
  options?: ToastOptions
) => void {
  return useContext(AppToastContext);
}
