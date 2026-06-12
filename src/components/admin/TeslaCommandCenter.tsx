"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { MapPin, Phone, Shield } from "lucide-react";
import { useAdminCommandCenter } from "@/contexts/AdminCommandCenterContext";
import {
  emergencyDriverName,
  emergencyLocationLabel,
  emergencyMapsUrl,
  emergencyPhoneDisplay,
  emergencyPhoneTel,
  emergencyTaxiCompany,
  emergencyTaxiNumber,
  formatEmergencyActivatedAgo,
  getEmergencyGpsStatus,
  type EmergencyAlertWithDriver,
} from "@/lib/emergency";
import { APP_NAME } from "@/lib/constants";
import { formatDriverActivity } from "@/lib/admin-command-center";
import { cn } from "@/lib/utils";

function ClockDisplay() {
  const [time, setTime] = useState("");

  useEffect(() => {
    function tick() {
      setTime(
        new Date().toLocaleTimeString("sv-SE", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    }
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return <span className="font-mono text-lg text-white">{time}</span>;
}

function SummaryChip({
  icon,
  label,
  value,
  alert,
}: {
  icon: string;
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-[120px] flex-1 flex-col rounded-[14px] border bg-[#262B31] px-4 py-3",
        alert && value > 0
          ? "border-[#FF3B30]/60 admin-pulse-emergency"
          : "border-[#3A4048]"
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#8A9099]">
        {icon} {label}
      </span>
      <span className="mt-1 text-2xl font-bold text-white">{value}</span>
    </div>
  );
}

function TeslaEmergencyPanel({
  emergency,
  isNew,
  canViewPhone,
  onResolve,
}: {
  emergency: EmergencyAlertWithDriver | null;
  isNew: boolean;
  canViewPhone: boolean;
  onResolve: (id: string) => Promise<void>;
}) {
  const [closing, setClosing] = useState(false);

  if (!emergency) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-[18px] border border-[#3A4048] bg-[#262B31] p-8 text-center">
        <p className="text-4xl">✅</p>
        <p className="mt-3 text-lg font-semibold text-[#22C55E]">
          Inga aktiva nödlägen
        </p>
        <p className="mt-1 text-sm text-[#8A9099]">
          Taxi i nöd visas här automatiskt
        </p>
      </div>
    );
  }

  const driverName = emergencyDriverName(emergency);
  const mapLink = emergencyMapsUrl(emergency);
  const phoneTel = canViewPhone ? emergencyPhoneTel(emergency.driver) : null;
  const phoneDisplay = emergencyPhoneDisplay(emergency.driver);
  const gps = getEmergencyGpsStatus(emergency);

  async function handleResolve() {
    if (!emergency) return;
    if (!window.confirm("Markera nödläget som löst?")) return;
    setClosing(true);
    await onResolve(emergency.id);
    setClosing(false);
  }

  return (
    <div
      className={cn(
        "rounded-[18px] border border-[#FF3B30]/50 bg-[#262B31] p-5",
        isNew && "admin-pulse-emergency ring-2 ring-[#FF3B30]/40"
      )}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-[#FF3B30]">
        🆘 Aktiv nödsituation
      </p>
      <h2 className="mt-2 text-2xl font-bold text-white">{driverName}</h2>
      <p className="mt-1 text-sm text-[#B0B6BE]">
        {emergencyTaxiCompany(emergency.driver)}
      </p>
      <p className="text-sm font-semibold text-white">
        🚕 Taxi {emergencyTaxiNumber(emergency.driver)}
      </p>

      <dl className="mt-4 space-y-2 text-sm">
        {canViewPhone && phoneDisplay !== "Ej angivet" && (
          <div className="flex justify-between gap-4">
            <dt className="text-[#8A9099]">📞 Telefon</dt>
            <dd className="font-mono font-semibold text-white">{phoneDisplay}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-[#8A9099]">📍 Plats</dt>
          <dd className="text-right font-medium text-white">
            {emergencyLocationLabel(emergency)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[#8A9099]">🛰 GPS</dt>
          <dd className="font-medium text-white">{gps.label}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[#8A9099]">🕒 Aktiverad</dt>
          <dd className="text-white">
            {formatEmergencyActivatedAgo(emergency.created_at)}
          </dd>
        </div>
      </dl>

      <div className="mt-5 space-y-2">
        {mapLink && (
          <a
            href={mapLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex w-full items-center justify-center gap-2 !min-h-[52px] !bg-[#FF3B30] !text-white hover:!bg-[#e0342b]"
          >
            <MapPin className="h-5 w-5" />
            📍 Öppna i Google Maps
          </a>
        )}
        {phoneTel && (
          <a
            href={`tel:${phoneTel}`}
            className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-[#3A4048] bg-[#1B1E22] py-3.5 text-base font-semibold text-white"
          >
            <Phone className="h-5 w-5" />
            Ring förare
          </a>
        )}
        <button
          type="button"
          disabled={closing}
          onClick={() => void handleResolve()}
          className="w-full rounded-[16px] border border-[#22C55E]/40 bg-[#22C55E]/15 py-3.5 text-base font-semibold text-[#22C55E] disabled:opacity-50"
        >
          {closing ? "Markerar…" : "✅ Markera som löst"}
        </button>
      </div>
    </div>
  );
}

/** Full-screen Tesla / desktop dispatch center — no navigation required. */
export function TeslaCommandCenter() {
  const { snapshot, refreshLabel, newEmergencyIds, refresh } =
    useAdminCommandCenter();

  const resolveEmergency = useCallback(
    async (alertId: string) => {
      const res = await fetch("/api/alerts/close-emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      });
      if (!res.ok) {
        const data = await res.json();
        window.alert(data.error ?? "Kunde inte avsluta nödläge.");
        return;
      }
      void refresh();
    },
    [refresh]
  );

  const counts = snapshot?.counts;
  const stats = snapshot?.stats;
  const primaryEmergency = snapshot?.emergencies[0] ?? null;
  const emergencyIsNew = primaryEmergency
    ? newEmergencyIds.has(primaryEmergency.id)
    : false;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#1E2125] text-white">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-[#3A4048] px-6 py-3">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt={APP_NAME}
            width={36}
            height={36}
            className="rounded-lg"
          />
          <div>
            <p className="text-sm font-bold">{APP_NAME}</p>
            <span className="rounded-md bg-[#3B82F6]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#3B82F6]">
              Admin läge
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#8A9099]" />
          <h1 className="text-lg font-bold tracking-tight">
            ADMIN COMMAND CENTER
          </h1>
        </div>

        <div className="flex items-center gap-6 text-right">
          <p className="text-[11px] font-medium text-[#22C55E]">{refreshLabel}</p>
          <ClockDisplay />
        </div>
      </header>

      {/* Summary bar */}
      <div className="flex shrink-0 gap-3 overflow-x-auto border-b border-[#3A4048] px-6 py-3">
        <SummaryChip
          icon="🚕"
          label="Aktiva förare"
          value={stats?.activeDrivers ?? 0}
        />
        <SummaryChip
          icon="🆘"
          label="Nödlägen"
          value={counts?.emergency ?? 0}
          alert
        />
        <SummaryChip
          icon="⚠️"
          label="Aktiva rapporter"
          value={stats?.activeReports ?? 0}
        />
        <SummaryChip
          icon="🔍"
          label="Civilkoll"
          value={counts?.civilkoll ?? 0}
        />
        <SummaryChip
          icon="👤"
          label="Väntar godk."
          value={counts?.users ?? 0}
        />
        <SummaryChip
          icon="🎁"
          label="Erbjudanden"
          value={stats?.activeDeals ?? 0}
        />
      </div>

      {/* Main 3-column grid */}
      <div className="grid min-h-0 flex-1 grid-cols-12 gap-4 overflow-hidden p-4">
        {/* Live feed */}
        <section className="col-span-4 flex min-h-0 flex-col rounded-[18px] border border-[#3A4048] bg-[#262B31]">
          <h2 className="shrink-0 border-b border-[#3A4048] px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#8A9099]">
            Live flöde — alla rapporter
          </h2>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {(snapshot?.liveFeed ?? []).length === 0 ? (
              <li className="p-6 text-center text-sm text-[#8A9099]">
                Inga aktiva rapporter
              </li>
            ) : (
              snapshot!.liveFeed.map((item) => (
                <li
                  key={item.id}
                  className="border-b border-[#3A4048]/60 px-4 py-3 last:border-0"
                >
                  <p className="font-semibold text-white">{item.type_label}</p>
                  <p className="mt-0.5 text-sm text-[#B0B6BE]">
                    {item.driver_name} · {item.location}
                  </p>
                  <p className="mt-0.5 text-xs text-[#8A9099]">{item.time_label}</p>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Emergency */}
        <section className="col-span-4 flex min-h-0 flex-col">
          <h2 className="mb-3 shrink-0 text-xs font-bold uppercase tracking-widest text-[#FF3B30]">
            Nödsituation — högsta prioritet
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <TeslaEmergencyPanel
              emergency={primaryEmergency}
              isNew={emergencyIsNew}
              canViewPhone={snapshot?.canViewEmergencyPhone ?? false}
              onResolve={resolveEmergency}
            />
            {(snapshot?.emergencies.length ?? 0) > 1 && (
              <ul className="mt-3 space-y-2">
                {snapshot!.emergencies.slice(1).map((e) => (
                  <li
                    key={e.id}
                    className={cn(
                      "rounded-[14px] border border-[#FF3B30]/30 bg-[#FF3B30]/5 px-3 py-2 text-sm",
                      newEmergencyIds.has(e.id) && "admin-pulse-emergency"
                    )}
                  >
                    🆘 {emergencyDriverName(e)} ·{" "}
                    {formatEmergencyActivatedAgo(e.created_at)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Active drivers */}
        <section className="col-span-4 flex min-h-0 flex-col rounded-[18px] border border-[#3A4048] bg-[#262B31]">
          <h2 className="shrink-0 border-b border-[#3A4048] px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#8A9099]">
            Aktiva förare ({stats?.verifiedDrivers ?? 0} verifierade)
          </h2>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {(snapshot?.drivers ?? []).slice(0, 20).map((driver) => (
              <li
                key={driver.id}
                className="flex items-start gap-3 border-b border-[#3A4048]/60 px-4 py-3 last:border-0"
              >
                <span
                  className={cn(
                    "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
                    driver.is_online ? "bg-[#22C55E]" : "bg-[#4A5159]"
                  )}
                  title={driver.is_online ? "Online" : "Offline"}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-white">
                    {driver.display_name ??
                      driver.cabradar_user_id ??
                      "Okänd"}
                    {driver.beta_user && (
                      <span className="ml-2 text-[10px] font-bold text-[#A855F7]">
                        BETA
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[#8A9099]">
                    {driver.reports_count} rapporter ·{" "}
                    {driver.verification_status === "verified"
                      ? "Verifierad"
                      : "Väntar"}
                  </p>
                  <p className="text-xs text-[#8A9099]">
                    {formatDriverActivity(driver.last_known_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Bottom attention strip */}
      <div className="shrink-0 border-t border-[#3A4048] bg-[#1B1E22] px-6 py-3">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wide text-[#8B5CF6]">
              🔍 Civilkoll — väntar
            </h3>
            <ul className="mt-2 space-y-1">
              {(snapshot?.pendingCivil ?? []).length === 0 ? (
                <li className="text-sm text-[#8A9099]">Inget att granska</li>
              ) : (
                snapshot!.pendingCivil.slice(0, 4).map((c) => (
                  <li key={c.id} className="text-sm text-[#B0B6BE]">
                    {c.registration_number}
                    {c.submitter_display_name
                      ? ` · ${c.submitter_display_name}`
                      : ""}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wide text-[#F4C430]">
              👤 Nya registreringar
            </h3>
            <ul className="mt-2 space-y-1">
              {(snapshot?.pendingUsers ?? []).length === 0 ? (
                <li className="text-sm text-[#8A9099]">Inga väntande</li>
              ) : (
                snapshot!.pendingUsers.slice(0, 4).map((u) => (
                  <li key={u.id} className="text-sm text-[#B0B6BE]">
                    {u.display_name ?? u.cabradar_user_id ?? "Ny förare"}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-wide text-[#22C55E]">
              🎁 Aktiva erbjudanden
            </h3>
            <ul className="mt-2 space-y-1">
              {(snapshot?.activeOffers ?? []).length === 0 ? (
                <li className="text-sm text-[#8A9099]">Inga aktiva</li>
              ) : (
                snapshot!.activeOffers.slice(0, 4).map((o) => (
                  <li key={o.id} className="text-sm text-[#B0B6BE]">
                    {o.offer_title || o.business_name}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="flex shrink-0 items-center justify-between border-t border-[#3A4048] px-6 py-2 text-[11px] text-[#8A9099]">
        <span>{APP_NAME} Admin Command Center</span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#22C55E]" />
          Systemet uppdateras automatiskt · LIVE
        </span>
      </footer>
    </div>
  );
}
