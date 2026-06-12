"use client";



import {
  emergencyCabradarId,
  emergencyDriverName,
  emergencyLocationLabel,
  emergencyMapsUrl,
  emergencyPhoneDisplay,
  emergencyPhoneTel,
  emergencyTaxiCompany,
  emergencyTaxiNumber,
  formatEmergencyActivatedAgo,
  formatSpeedKmh,
  formatTimeSince,
  getEmergencyGpsStatus,
  type EmergencyAlertWithDriver,
} from "@/lib/emergency";

import { formatSwedishDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";

import { ArrowLeft, MapPin, Phone } from "lucide-react";



interface AdminEmergencyDetailProps {

  alert: EmergencyAlertWithDriver;

  closing: boolean;

  showBack: boolean;

  canViewPhone: boolean;

  onBack: () => void;

  onClose: () => void;

}



function DetailRow({

  icon,

  label,

  value,

  valueClassName,

}: {

  icon?: string;

  label: string;

  value: string;

  valueClassName?: string;

}) {

  return (

    <div className="border-b border-card-border/60 py-3 last:border-0">

      <dt className="text-xs font-medium uppercase tracking-wide text-muted">

        {icon ? `${icon} ` : ""}

        {label}

      </dt>

      <dd className={cn("mt-1 text-base font-semibold break-words", valueClassName)}>

        {value}

      </dd>

    </div>

  );

}



export function AdminEmergencyDetail({

  alert,

  closing,

  showBack,

  canViewPhone,

  onBack,

  onClose,

}: AdminEmergencyDetailProps) {

  const driver = alert.driver;
  const driverName = emergencyDriverName(alert);
  const cabradarId = emergencyCabradarId(driver);

  const phoneDisplay = emergencyPhoneDisplay(driver);
  const phoneTel = canViewPhone ? emergencyPhoneTel(driver) : null;

  const mapLink = emergencyMapsUrl(alert);

  const gps = getEmergencyGpsStatus(alert);

  const speed = formatSpeedKmh(alert.emergency_last_speed_mps);

  const movementSince = formatTimeSince(alert.emergency_last_movement_at);

  const lastGpsSince = formatTimeSince(alert.emergency_last_gps_at);

  const lastGpsAt = alert.emergency_last_gps_at
    ? formatSwedishDateTime(alert.emergency_last_gps_at)
    : "—";



  return (

    <div className="space-y-4">

      {showBack && (

        <button

          type="button"

          onClick={onBack}

          className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground"

        >

          <ArrowLeft className="h-4 w-4" />

          Alla nödlägen

        </button>

      )}



      <div className="rounded-2xl border border-danger/40 bg-danger/10 p-5">

        <p className="text-xs font-semibold uppercase tracking-wide text-danger">

          Taxi i nöd

        </p>

        <h2 className="mt-1 text-2xl font-bold leading-tight">🆘 {driverName}</h2>
        <p className="mt-1 text-sm text-muted">
          CabRadar ID:{" "}
          <span className="font-mono font-semibold text-foreground">{cabradarId}</span>
        </p>
      </div>

      {alert.driver_load_debug && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {alert.driver_load_debug}
        </p>
      )}

      <section className="rounded-2xl border border-card-border bg-card px-4">
        <DetailRow icon="👤" label="Förare" value={driverName} />
        <DetailRow
          icon="🚕"
          label="Taxinummer"
          value={
            emergencyTaxiNumber(driver) !== "Ej angivet"
              ? `Taxi ${emergencyTaxiNumber(driver)}`
              : emergencyTaxiNumber(driver)
          }

          valueClassName={

            emergencyTaxiNumber(driver) !== "Ej angivet" ? "text-xl" : undefined

          }

        />

        <DetailRow icon="🏢" label="Taxibolag" value={emergencyTaxiCompany(driver)} />

        {canViewPhone && (
          <DetailRow
            icon="📞"
            label="Mobilnummer"
            value={phoneDisplay}
            valueClassName={
              phoneDisplay !== "Ej angivet" ? "font-mono text-lg" : "text-muted"
            }
          />
        )}

        <DetailRow

          icon="🕒"

          label="Aktiverad"

          value={formatEmergencyActivatedAgo(alert.created_at)}

        />

        <DetailRow

          icon="📍"

          label="Nuvarande plats"

          value={emergencyLocationLabel(alert)}

        />

      </section>



      <section className="rounded-2xl border border-card-border bg-card p-4">

        <h3 className="text-sm font-bold">GPS-status</h3>

        <p

          className={cn(

            "mt-2 text-lg font-bold",

            gps.tone === "moving" && "text-success",

            gps.tone === "stationary" && "text-amber-400",

            gps.tone === "unknown" && "text-muted"

          )}

        >

          {gps.label}

        </p>

        <dl className="mt-3 space-y-2 text-sm">

          {speed && (

            <div className="flex justify-between gap-4">

              <dt className="text-muted">Hastighet</dt>

              <dd className="font-medium">{speed}</dd>

            </div>

          )}

          <div className="flex justify-between gap-4">

            <dt className="text-muted">Senaste GPS-uppdatering</dt>

            <dd className="text-right font-medium">

              {lastGpsAt}

              {lastGpsSince ? ` (${lastGpsSince})` : ""}

            </dd>

          </div>

          <div className="flex justify-between gap-4">

            <dt className="text-muted">Tid sedan senaste rörelse</dt>

            <dd className="text-right font-medium">{movementSince ?? "—"}</dd>

          </div>

        </dl>

      </section>



      {alert.description && (

        <p className="rounded-2xl border border-card-border bg-card/80 p-4 text-sm leading-relaxed">

          {alert.description}

        </p>

      )}



      <div className="sticky bottom-0 -mx-4 space-y-2 border-t border-card-border bg-background/95 px-4 pb-2 pt-3 backdrop-blur-sm safe-bottom">

        {mapLink && (

          <a

            href={mapLink}

            target="_blank"

            rel="noopener noreferrer"

            className="btn-primary flex w-full items-center justify-center gap-2 !min-h-[48px]"

          >

            <MapPin className="h-4 w-4" />

            📍 Öppna i karta

          </a>

        )}

        {phoneTel && (

          <a

            href={`tel:${phoneTel}`}

            className="flex w-full items-center justify-center gap-2 rounded-xl border border-card-border bg-card py-3 text-sm font-semibold"

          >

            <Phone className="h-4 w-4" />

            📞 Ring förare

            <span className="font-normal text-muted">({phoneDisplay})</span>

          </a>

        )}

        <button

          type="button"

          disabled={closing}

          onClick={onClose}

          className="btn-danger w-full !min-h-[48px] disabled:opacity-50"

        >

          {closing ? "Markerar…" : "✅ Markera som löst"}

        </button>

      </div>

    </div>

  );

}

