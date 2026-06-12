"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ADMIN_COMMAND_CENTER_HEADER_HEIGHT } from "@/components/admin/TeslaCommandCenterHeader";

const TOAST_MS = 2000;

type ToastState = { id: number; message: string };

const AdminToastContext = createContext<(message: string) => void>(() => {});

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string) => {
    setToast({ id: Date.now(), message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <AdminToastContext.Provider value={showToast}>
      {children}
      {toast && (
        <div
          className="pointer-events-none fixed right-4 z-[200] max-w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-white/10 bg-[#262B31] px-4 py-2.5 text-sm font-semibold leading-snug text-white shadow-lg"
          style={{ top: ADMIN_COMMAND_CENTER_HEADER_HEIGHT + 8 }}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}
    </AdminToastContext.Provider>
  );
}

export function useAdminToast(): (message: string) => void {
  return useContext(AdminToastContext);
}

export const ADMIN_REPORT_SUBMIT_ERROR =
  "❌ Kunde inte skicka rapporten.\nFörsök igen.";
