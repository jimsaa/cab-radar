"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAdminDispatchMap } from "@/contexts/AdminDispatchMapContext";
import { AdminDispatchMapView } from "@/components/admin/AdminDispatchMapView";

export function AdminDispatchMapModal() {
  const { isOpen, focusReportId, closeMap } = useAdminDispatchMap();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMap();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeMap]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      className="admin-dispatch-map-overlay fixed inset-0 z-[600] flex items-center justify-center bg-black/75 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Utökad nätverkskarta"
      onClick={closeMap}
    >
      <div
        className="relative flex h-[92vh] w-[min(98vw,1400px)] flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <AdminDispatchMapView
          mode="modal"
          focusReportId={focusReportId}
          onClose={closeMap}
          className="h-full shadow-2xl"
        />
      </div>
    </div>,
    document.body
  );
}
