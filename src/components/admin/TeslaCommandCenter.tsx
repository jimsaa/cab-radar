"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Phone, Shield } from "lucide-react";
import { TeslaLiveFeedPanel } from "@/components/admin/TeslaLiveFeedPanel";
import { TeslaNavigationButtons } from "@/components/admin/TeslaNavigationButtons";
import { TeslaQuickReportPanel } from "@/components/admin/TeslaQuickReportPanel";
import { useAdminCommandCenter } from "@/contexts/AdminCommandCenterContext";
import { formatDriverCityLabel } from "@/lib/driver-city";
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
import { APP_NAME } from "@/lib/constants";
import { formatDriverActivity } from "@/lib/admin-command-center";
import { TEST_EMERGENCY_DISCLAIMER } from "@/lib/test-mode";
import { TestBadge } from "@/components/test-mode/TestModeBanner";
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

function TeslaEmergencyCard({
  emergency,
  isNew,
  canViewPhone,
  onResolve,
}: {
  emergency: EmergencyAlertWithDriver;
  isNew: boolean;
  canViewPhone: boolean;
  onResolve: (id: string) => Promise<void>;
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
        "grid gap-4 rounded-[18px] border p-5 lg:grid-cols-[1fr_auto]",
        isTest
          ? "admin-pulse-emergency border-amber-500/60 bg-amber-500/10"
          : "admin-pulse-emergency border-[#FF3B30]/60 bg-[#262B31]",
        isNew && !isTest && "ring-2 ring-[#FF3B30]/50",
        isNew && isTest && "ring-2 ring-amber-500/50"
      )}
    >
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

  async function verifyDriver(driverId: string, action: "approve" | "reject") {
    const res = await fetch("/api/admin/verify-driver", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverId, action }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      window.alert(data.error ?? "Kunde inte uppdatera föraren.");
      return;
    }
    void refresh();
  }

  async function reviewCivil(submissionId: string, action: "approve" | "reject") {
    const res = await fetch("/api/admin/civilkoll/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId, action, adminNotes: "" }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      window.alert(data.error ?? "Kunde inte granska.");
      return;
    }
    void refresh();
  }

  const emergencies = snapshot?.emergencies ?? [];
  const liveEmergencies = emergencies.filter((e) => !e.is_test);
  const testEmergencies = emergencies.filter((e) => e.is_test);
  const stats = snapshot?.stats;

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

      {/* 1. Emergency — live incidents only */}
      <section className="shrink-0 border-b border-[#3A4048] px-4 py-3">
        {liveEmergencies.length === 0 ? (
          <div className="flex items-center justify-center gap-3 rounded-[18px] border border-[#3A4048] bg-[#262B31] px-6 py-4">
            <span className="text-2xl">✅</span>
            <p className="text-lg font-semibold text-[#22C55E]">
              Inga aktiva nödlägen
            </p>
          </div>
        ) : (
          <div className="space-y-3 rounded-[18px] border border-[#FF3B30]/30 bg-[#FF3B30]/5 p-2">
            {liveEmergencies.map((e) => (
              <TeslaEmergencyCard
                key={e.id}
                emergency={e}
                isNew={newEmergencyIds.has(e.id)}
                canViewPhone={snapshot?.canViewEmergencyPhone ?? false}
                onResolve={resolveEmergency}
              />
            ))}
          </div>
        )}
      </section>

      {/* 1b. Test emergencies */}
      {testEmergencies.length > 0 && (
        <section className="shrink-0 border-b border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-300">
            🧪 Testläge — nödsituationer
          </h3>
          <div className="space-y-3">
            {testEmergencies.map((e) => (
              <TeslaEmergencyCard
                key={e.id}
                emergency={e}
                isNew={newEmergencyIds.has(e.id)}
                canViewPhone={snapshot?.canViewEmergencyPhone ?? false}
                onResolve={resolveEmergency}
              />
            ))}
          </div>
        </section>
      )}

      {/* 2. Main operation area — 3 columns */}
      <div className="grid min-h-0 flex-1 grid-cols-12 gap-3 overflow-hidden p-3">
        {/* Left — quick report */}
        <section className="col-span-3 flex min-h-0 flex-col rounded-[18px] border border-[#3A4048] bg-[#262B31]">
          <h2 className="shrink-0 border-b border-[#3A4048] px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#8A9099]">
            Snabbrapport
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <TeslaQuickReportPanel onReported={() => void refresh()} />
          </div>
        </section>

        {/* Center — live feed + navigation detail */}
        <section className="relative col-span-6 flex min-h-0 flex-col rounded-[18px] border border-[#3A4048] bg-[#262B31]">
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

        {/* Right — active drivers */}
        <section className="col-span-3 flex min-h-0 flex-col rounded-[18px] border border-[#3A4048] bg-[#262B31]">
          <h2 className="shrink-0 border-b border-[#3A4048] px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#8A9099]">
            Aktiva förare
            <span className="ml-2 font-normal text-[#8A9099]">
              ({stats?.activeDrivers ?? 0} online)
            </span>
          </h2>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {(snapshot?.drivers ?? []).slice(0, 25).map((driver) => (
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
                    {driver.verification_status === "verified"
                      ? "✓ Verifierad"
                      : "⏳ Väntar"}{" "}
                    · {driver.reports_count} rapporter
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

      {/* 3. Lower section — admin tasks + testläge */}
      <div className="grid shrink-0 grid-cols-3 gap-3 border-t border-[#3A4048] bg-[#1B1E22] px-4 py-3">
        {/* Civilkoll */}
        <section className="rounded-[16px] border border-[#3A4048] bg-[#262B31] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-[#8B5CF6]">
            🔍 Civilkoll — väntar granskning
          </h3>
          <ul className="mt-3 max-h-[140px] space-y-2 overflow-y-auto">
            {(snapshot?.pendingCivil ?? []).length === 0 ? (
              <li className="text-sm text-[#8A9099]">Inget att granska</li>
            ) : (
              snapshot!.pendingCivil.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-2 rounded-[12px] bg-[#1B1E22] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="font-mono font-semibold text-white">
                      {c.registration_number}
                    </p>
                    {c.submitter_display_name && (
                      <p className="truncate text-xs text-[#8A9099]">
                        {c.submitter_display_name}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => void reviewCivil(c.id, "approve")}
                      className="rounded-lg bg-[#22C55E]/20 px-2 py-1 text-xs font-semibold text-[#22C55E]"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => void reviewCivil(c.id, "reject")}
                      className="rounded-lg bg-[#FF3B30]/20 px-2 py-1 text-xs font-semibold text-[#FF3B30]"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Pending driver onboarding */}
        <section className="rounded-[16px] border border-[#3A4048] bg-[#262B31] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-[#F4C430]">
            👤 Väntar onboarding
          </h3>
          <ul className="mt-3 max-h-[180px] space-y-2 overflow-y-auto">
            {(snapshot?.pendingUsers ?? []).length === 0 ? (
              <li className="text-sm text-[#8A9099]">Inga väntande</li>
            ) : (
              snapshot!.pendingUsers.map((u) => {
                const phone = u.phone_number?.replace(/\s/g, "");
                return (
                  <li
                    key={u.id}
                    className="rounded-[12px] bg-[#1B1E22] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">
                        {u.display_name ?? u.cabradar_user_id ?? "Ny förare"}
                      </p>
                      <p className="text-xs text-[#8A9099]">
                        {u.phone_number ?? "—"} ·{" "}
                        {formatDriverCityLabel(u.driver_city)}
                      </p>
                      <p className="truncate text-xs text-[#8A9099]">
                        {u.taxi_company_name ?? "—"}
                        {u.taxi_number ? ` · Taxi ${u.taxi_number}` : ""}
                      </p>
                      <p className="text-[10px] text-[#8A9099]">
                        {new Date(u.created_at).toLocaleDateString("sv-SE")}
                      </p>
                    </div>
                    <div className="mt-2 flex shrink-0 flex-wrap gap-1">
                      {phone && (
                        <a
                          href={`tel:${phone}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#3A4048] bg-[#262B31] px-2 py-1 text-xs font-semibold text-white"
                        >
                          <Phone className="h-3 w-3" />
                          Ring upp
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => void verifyDriver(u.id, "approve")}
                        className="rounded-lg bg-[#22C55E]/20 px-2 py-1 text-xs font-semibold text-[#22C55E]"
                      >
                        ✅ Aktivera
                      </button>
                      <button
                        type="button"
                        onClick={() => void verifyDriver(u.id, "reject")}
                        className="rounded-lg bg-[#FF3B30]/20 px-2 py-1 text-xs font-semibold text-[#FF3B30]"
                      >
                        ❌ Avvisa
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </section>

        {/* Testläge — training reports & civilkoll */}
        <section className="rounded-[16px] border border-amber-500/40 bg-amber-500/5 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-amber-300">
            🧪 Testläge
          </h3>
          <ul className="mt-3 max-h-[120px] space-y-2 overflow-y-auto">
            {(snapshot?.testLiveFeed ?? []).length === 0 &&
            (snapshot?.testPendingCivil ?? []).length === 0 ? (
              <li className="text-sm text-amber-200/70">Inga testhändelser</li>
            ) : (
              <>
                {(snapshot?.testLiveFeed ?? []).slice(0, 6).map((item) => (
                  <li
                    key={item.id}
                    className="rounded-[12px] bg-[#1B1E22]/80 px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-amber-100">
                      {item.type_label}
                    </p>
                    <p className="truncate text-xs text-amber-200/80">
                      {item.driver_name} · {item.location}
                    </p>
                  </li>
                ))}
                {(snapshot?.testPendingCivil ?? []).map((c) => (
                  <li
                    key={c.id}
                    className="rounded-[12px] bg-[#1B1E22]/80 px-3 py-2"
                  >
                    <p className="text-sm font-semibold text-amber-100">
                      🧪 TEST – Civilkoll
                    </p>
                    <p className="font-mono text-xs text-amber-200/80">
                      {c.registration_number}
                    </p>
                  </li>
                ))}
              </>
            )}
          </ul>
        </section>
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
