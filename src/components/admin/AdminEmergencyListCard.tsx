"use client";

import {
  emergencyCabradarId,
  emergencyDriverName,
  emergencyLocationShort,
  emergencyTaxiNumber,
  type EmergencyAlertWithDriver,
} from "@/lib/emergency";
import { ChevronRight } from "lucide-react";

interface AdminEmergencyListCardProps {
  alert: EmergencyAlertWithDriver;
  onSelect: () => void;
}

export function AdminEmergencyListCard({
  alert,
  onSelect,
}: AdminEmergencyListCardProps) {
  const driverName = emergencyDriverName(alert);
  const taxiNumber = emergencyTaxiNumber(alert.driver);
  const location = emergencyLocationShort(alert);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-4 text-left transition active:scale-[0.99] hover:border-danger/60"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-danger">
          🆘 {driverName}
        </p>
        <p className="mt-0.5 text-sm font-semibold">
          🚕 {taxiNumber === "Ej angivet" ? taxiNumber : `Taxi ${taxiNumber}`}
        </p>
        <p className="mt-0.5 truncate text-sm text-muted">📍 {location}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
    </button>
  );
}
