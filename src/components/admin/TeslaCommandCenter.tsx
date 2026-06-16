"use client";

import { useCallback, useState } from "react";
import { Phone } from "lucide-react";
import { useAdminToast } from "@/components/admin/AdminToast";
import { TeslaEmergencyAttentionBanner } from "@/components/admin/TeslaEmergencyAttentionBanner";
import { TeslaLiveFeedPanel } from "@/components/admin/TeslaLiveFeedPanel";
import { TeslaNetworkMap } from "@/components/admin/TeslaNetworkMap";
import { TeslaNavigationButtons } from "@/components/admin/TeslaNavigationButtons";
import { ADMIN_COMMAND_CENTER_HEADER_HEIGHT } from "@/components/admin/TeslaCommandCenterHeader";
import { TeslaQuickReportPanel } from "@/components/admin/TeslaQuickReportPanel";
import { AdminCivilkollActions } from "@/components/admin/AdminCivilkollActions";
import { AdminMessagesPanel } from "@/components/admin/AdminMessagesPanel";
import { ActiveDriversNetworkStatus } from "@/components/admin/ActiveDriversNetworkStatus";
import { useAdminCommandCenter } from "@/contexts/AdminCommandCenterContext";
import {
  emergencyDriverName,
  emergencyLocationLabel,
  emergencyPhoneDisplay,
  emergencyPhoneTel,
  emergencyTaxiCompany,
  emergencyTaxiNumber,
  formatEmergencyActivatedAgo,
  getEmergencyGpsStatus,
  type EmergencyAlertWithDriver,
} from "@/lib/emergency";
import { TEST_EMERGENCY_DISCLAIMER } from "@/lib/test-mode";
import { TestBadge } from "@/components/test-mode/TestModeBanner";
import { cn } from "@/lib/utils";

function TeslaEmergencyCard({
  emergency,
  attentionPulseClass,
  showAkutBadge,
  canViewPhone,
  onResolve,
  onAcknowledge,
}: {
  emergency: EmergencyAlertWithDriver;
  attentionPulseClass: string;
  showAkutBadge: boolean;
  canViewPhone: boolean;
  onResolve: (id: string) => Promise<void>;
  onAcknowledge: (id: string) => void;
}) {
  const [closing, setClosing] = useState(false);
  const driverName = emergencyDriverName(emergency);
  const locationLabel = emergencyLocationLabel(emergency);
  const navLat =
    emergency.emergency_last_latitude ?? emergency.latitude;
  const navLng =
    emergency.emergency_last_longitude ?? emergency.longitude;
  const phoneTel = canViewPhone ? emergencyPhoneTel(emergency.driver) : null;
  const phoneDisplay = emergencyPhoneDisplay(emergency.driver);
  const gps = getEmergencyGpsStatus(emergency);

  async function handleResolve() {
    if (!window.confirm("Markera nödläget som löst?")) return;
    setClosing(true);
    await onResolve(emergency.id);
    setClosing(false);
  }

  const isTest = Boolean(emergency.is_test);

  return (
    <div
      className={cn(
        "relative grid w-full gap-4 rounded-[18px] border-2 p-5 lg:grid-cols-[1fr_auto]",
        isTest
          ? "border-amber-500/60 bg-amber-500/10"
          : "admin-report-border-emergency border-[#FF3B30]/70 bg-[#262B31] shadow-[0_0_24px_rgba(255,59,48,0.12)]",
        attentionPulseClass
      )}
    >
      {showAkutBadge && !isTest && (
        <span className="absolute right-4 top-4 rounded-full bg-[#FF3B30] px-3 py-1.5 text-xs font-black tracking-wider text-white">
          AKUT
        </span>
      )}
      <div>
        {isTest && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <TestBadge />
            <p className="text-xs font-medium text-amber-200">
              {TEST_EMERGENCY_DISCLAIMER}
            </p>
          </div>
        )}
        <p
          className={cn(
            "text-xs font-bold uppercase tracking-widest",
            isTest ? "text-amber-300" : "text-[#FF3B30]"
          )}
        >
          {isTest ? "🧪 TEST – Aktiv nödsituation" : "🆘 Aktiv nödsituation"}
        </p>
        <h2 className="mt-1 text-2xl font-bold text-white">{driverName}</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCell label="Taxibolag" value={emergencyTaxiCompany(emergency.driver)} />
          <InfoCell
            label="Taxinummer"
            value={`Taxi ${emergencyTaxiNumber(emergency.driver)}`}
          />
          {canViewPhone && phoneDisplay !== "Ej angivet" && (
            <InfoCell label="Telefon" value={phoneDisplay} mono />
          )}
          <InfoCell label="Plats" value={emergencyLocationLabel(emergency)} />
          <InfoCell label="GPS" value={gps.label} />
          <InfoCell
            label="Aktiverad"
            value={formatEmergencyActivatedAgo(emergency.created_at)}
          />
        </div>
      </div>

      <div className="flex min-w-[200px] flex-col justify-center gap-2 lg:w-56">
        <TeslaNavigationButtons
          size="large"
          target={{
            latitude: navLat,
            longitude: navLng,
            address: locationLabel,
          }}
        />
        {phoneTel && (
          <a
            href={`tel:${phoneTel}`}
            className="flex items-center justify-center gap-2 rounded-[14px] border border-[#3A4048] bg-[#1B1E22] px-4 py-3 text-sm font-semibold text-white"
          >
            <Phone className="h-4 w-4" />
            Ring förare
          </a>
        )}
        {showAkutBadge && !isTest && (
          <button
            type="button"
            onClick={() => onAcknowledge(emergency.id)}
            className="rounded-[14px] border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white"
          >
            Kvittera larm
          </button>
        )}
        <button
          type="button"
          disabled={closing}
          onClick={() => void handleResolve()}
          className="rounded-[14px] border border-[#22C55E]/40 bg-[#22C55E]/15 px-4 py-3 text-sm font-semibold text-[#22C55E] disabled:opacity-50"
        >
          {closing ? "Markerar…" : "✅ Markera som löst"}
        </button>
      </div>
    </div>
  );
}

function InfoCell({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[12px] bg-[#1B1E22]/80 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8A9099]">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm font-medium text-white",
          mono && "font-mono"
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** Full-screen Tesla dispatch center — emergencies top, ops below. */
export function TeslaCommandCenter() {
  const showToast = useAdminToast();
  const {
    snapshot,
    refresh,
    getReportAttention,
    acknowledgeEmergency,
    clearEmergencyAcknowledgement,
    unacknowledgedEmergencyIds,
  } = useAdminCommandCenter();

  const resolveEmergency = useCallback(
    async (alertId: string) => {
      const res = await fetch("/api/alerts/close-emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error ?? "Kunde inte avsluta nödläge.", {
          variant: "error",
        });
        return;
      }
      clearEmergencyAcknowledgement(alertId);
      void refresh();
    },
    [refresh, clearEmergencyAcknowledgement, showToast]
  );

  const emergencies = snapshot?.emergencies ?? [];
  const liveEmergencies = emergencies.filter((e) => !e.is_test);
  const testEmergencies = emergencies.filter((e) => e.is_test);
  const hasLiveEmergencies = liveEmergencies.length > 0;
  const stats = snapshot?.stats;

  return (
    <div
      className="flex flex-col overflow-hidden bg-[#1E2125] text-white"
      style={{ height: `calc(100dvh - ${ADMIN_COMMAND_CENTER_HEADER_HEIGHT}px)` }}
    >
      <TeslaEmergencyAttentionBanner
        emergencies={emergencies}
        unacknowledgedIds={unacknowledgedEmergencyIds}
        onAcknowledge={acknowledgeEmergency}
      />

      {/* Emergency detail cards */}
      {hasLiveEmergencies && (
        <section className="shrink-0 border-b-2 border-[#FF3B30]/50 bg-[#FF3B30]/[0.07] px-4 py-4">
          <div className="space-y-3">
            {liveEmergencies.map((e) => {
              const attention = getReportAttention(e.id, "taxi_emergency");
              return (
                <TeslaEmergencyCard
                  key={e.id}
                  emergency={e}
                  attentionPulseClass={attention.pulseClass}
                  showAkutBadge={attention.showAkutBadge}
                  canViewPhone={snapshot?.canViewEmergencyPhone ?? false}
                  onResolve={resolveEmergency}
                  onAcknowledge={acknowledgeEmergency}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Test emergencies */}
      {testEmergencies.length > 0 && (
        <section className="shrink-0 border-b border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-300">
            🧪 Testläge — nödsituationer
          </h3>
          <div className="space-y-3">
            {testEmergencies.map((e) => {
              const attention = getReportAttention(e.id, "taxi_emergency");
              return (
                <TeslaEmergencyCard
                  key={e.id}
                  emergency={e}
                  attentionPulseClass={attention.pulseClass}
                  showAkutBadge={attention.showAkutBadge}
                  canViewPhone={snapshot?.canViewEmergencyPhone ?? false}
                  onResolve={resolveEmergency}
                  onAcknowledge={acknowledgeEmergency}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Main operation area — 25% · 50% · 25% */}
      <div className="grid min-h-0 flex-1 grid-cols-12 gap-3 overflow-hidden p-3">
        {/* Left — Snabbrapport */}
        <section className="col-span-3 flex min-h-0 flex-col rounded-[18px] border border-[#3A4048] bg-[#262B31]">
          <h2 className="shrink-0 border-b border-[#3A4048] px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#8A9099]">
            Snabbrapport
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <TeslaQuickReportPanel onReported={() => void refresh()} />
          </div>
          <AdminCivilkollActions variant="tesla" />
          <AdminMessagesPanel variant="tesla" />
        </section>

        {/* Center — Live flöde (primary focus) */}
        <section className="col-span-6 flex min-h-0 flex-col rounded-[18px] border border-[#3A4048] bg-[#262B31]">
          <div className="shrink-0 border-b border-[#3A4048] px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0B6BE]">
              Live flöde
            </h2>
            <p className="mt-0.5 text-[10px] text-[#8A9099]">
              Tryck på en rapport · Skicka till Tesla för navigation
            </p>
          </div>
          <TeslaLiveFeedPanel items={snapshot?.liveFeed ?? []} />
        </section>

        {/* Right — network status + map */}
        <section className="col-span-3 flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-[#3A4048] bg-[#262B31]">
          <div className="shrink-0 border-b border-[#3A4048] px-4 py-3">
            <ActiveDriversNetworkStatus
              activeDrivers={stats?.activeDrivers ?? 0}
              lastDriverActivityAt={stats?.lastDriverActivityAt}
              variant="tesla"
            />
          </div>

          <TeslaNetworkMap height={420} className="min-h-0 flex-1" />
        </section>
      </div>
    </div>
  );
}
