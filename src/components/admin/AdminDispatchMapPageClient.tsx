"use client";

import { useSearchParams } from "next/navigation";
import { AdminDispatchMapView } from "@/components/admin/AdminDispatchMapView";

export function AdminDispatchMapPageClient() {
  const searchParams = useSearchParams();
  const focusReportId = searchParams.get("focus");

  return (
    <AdminDispatchMapView mode="page" focusReportId={focusReportId} />
  );
}
