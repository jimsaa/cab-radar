"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface AdminDispatchMapContextValue {
  isOpen: boolean;
  focusReportId: string | null;
  openMap: (focusReportId?: string | null) => void;
  closeMap: () => void;
}

const AdminDispatchMapContext =
  createContext<AdminDispatchMapContextValue | null>(null);

export function AdminDispatchMapProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusReportId, setFocusReportId] = useState<string | null>(null);

  const openMap = useCallback((reportId?: string | null) => {
    setFocusReportId(reportId ?? null);
    setIsOpen(true);
  }, []);

  const closeMap = useCallback(() => {
    setIsOpen(false);
    setFocusReportId(null);
  }, []);

  const value = useMemo(
    () => ({
      isOpen,
      focusReportId,
      openMap,
      closeMap,
    }),
    [isOpen, focusReportId, openMap, closeMap]
  );

  return (
    <AdminDispatchMapContext.Provider value={value}>
      {children}
    </AdminDispatchMapContext.Provider>
  );
}

export function useAdminDispatchMap(): AdminDispatchMapContextValue {
  const ctx = useContext(AdminDispatchMapContext);
  if (!ctx) {
    throw new Error(
      "useAdminDispatchMap must be used within AdminDispatchMapProvider"
    );
  }
  return ctx;
}

export function useAdminDispatchMapOptional():
  | AdminDispatchMapContextValue
  | null {
  return useContext(AdminDispatchMapContext);
}
