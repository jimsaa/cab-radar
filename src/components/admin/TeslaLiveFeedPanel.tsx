"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Copy, Check, MapPin } from "lucide-react";
import { ReportTypeIcon } from "@/components/icons/ReportTypeIcon";
import { TeslaNavigationButtons } from "@/components/admin/TeslaNavigationButtons";
import { useAdminCommandCenter } from "@/contexts/AdminCommandCenterContext";
import { useAdminDispatchMap } from "@/contexts/AdminDispatchMapContext";
import type { LiveFeedItem } from "@/lib/admin-command-center";
import { APP_NAME } from "@/lib/constants";
import { formatRelativeSwedish } from "@/lib/datetime";
import { maskLicenceLast4 } from "@/lib/licence.shared";
import { formatCoordinate } from "@/lib/tesla-navigation";
import { ReportCommentPreview } from "@/components/reports/ReportCommentPreview";
import { cn } from "@/lib/utils";

function reporterStatusLabel(item: LiveFeedItem): string {
  if (item.is_test) return "Testläge";
  switch (item.verification_status) {
    case "verified":
      return "Verifierad";
    case "pending_verification":
      return "Väntar verifiering";
    default:
      return "Overifierad";
  }
}

function reporterLegLine(item: LiveFeedItem): string | null {
  if (!item.driver_license_last4) return null;
  return `Taxi Leg ${maskLicenceLast4(item.driver_license_last4)}`;
}

function ReportAttentionBadge({
  showNy,
  showAkut,
}: {
  showNy: boolean;
  showAkut: boolean;
}) {
  if (showAkut) {
    return (
      <span className="absolute right-3 top-3 rounded-full bg-[#FF3B30] px-2.5 py-1 text-[11px] font-black tracking-wider text-white shadow-sm">
        AKUT
      </span>
    );
  }

  if (!showNy) return null;

  return (
    <span className="absolute right-3 top-3 rounded-full bg-[#FF3B30] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
      NY
    </span>
  );
}

export function TeslaReportDetailEmpty() {
  return (
    <div className="flex h-full min-h-[280px] flex-col items-center justify-center px-8 text-center">
      <Image
        src="/logo.png"
        alt={APP_NAME}
        width={56}
        height={56}
        className="mb-4 rounded-xl opacity-80"
      />
      <p className="max-w-sm text-lg font-medium leading-relaxed text-[#8A9099]">
        Välj en rapport i LIVE-flödet för att visa detaljer.
      </p>
    </div>
  );
}

export function TeslaReportDetailPanel({
  item,
  privacyMode = "admin",
}: {
  item: LiveFeedItem;
  privacyMode?: "admin" | "driving";
}) {
  const { openMap } = useAdminDispatchMap();
  const isDriving = privacyMode === "driving";
  const isEmergency = item.type === "taxi_emergency";
  const [copied, setCopied] = useState(false);
  const ageLabel = useMemo(
    () => formatRelativeSwedish(item.created_at),
    [item.created_at]
  );
  const legLine = isDriving ? null : reporterLegLine(item);
  const statusLabel = reporterStatusLabel(item);

  async function copyAddress() {
    if (!item.address) return;
    try {
      await navigator.clipboard.writeText(item.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Kopiera adress:", item.address);
    }
  }

  return (
    <div className="flex min-h-0 flex-col p-6">
      <div className="flex items-start gap-4">
        <ReportTypeIcon type={item.type} variant="large" className="text-white" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8A9099]">
            Rapportdetaljer
          </p>
          <h3 className="mt-1 text-3xl font-bold leading-tight text-white">
            {item.type_label}
          </h3>
          <p className="mt-2 text-lg font-medium text-[#B0B6BE]">{ageLabel}</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <DetailRow label="Plats" value={item.address} large />
        <DetailRow label="Tid" value={item.time_label} mono large />
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#8A9099]">
            {isDriving ? "Smeknamn" : "Rapporterad av"}
          </p>
          <p className="mt-1 text-xl font-semibold text-white">{item.driver_name}</p>
        </div>
        {legLine && <DetailRow label="Taxi Leg" value={legLine} mono large />}
        <DetailRow
          label="Status"
          value={statusLabel}
          large
          valueClassName={
            item.is_test
              ? "text-amber-300"
              : statusLabel === "Verifierad"
                ? "text-[#22C55E]"
                : "text-[#B0B6BE]"
          }
        />
      </div>

      {item.description?.trim() && (
        <div className="mt-6 rounded-[14px] border border-[#3A4048] bg-[#1B1E22]/90 px-4 py-4">
          <p className="text-xs font-bold uppercase tracking-widest text-[#8A9099]">
            Kommentar
          </p>
          <p className="mt-2 text-lg leading-relaxed text-white">
            {item.description.trim()}
          </p>
        </div>
      )}

      {(item.latitude != null || item.longitude != null) && !isDriving && (
        <p className="mt-4 font-mono text-xs text-[#6B7280]">
          {formatCoordinate(item.latitude)}, {formatCoordinate(item.longitude)}
        </p>
      )}

      <div className="mt-8 space-y-3">
        {item.latitude != null &&
          item.longitude != null &&
          !(isDriving && isEmergency) && (
          <button
            type="button"
            onClick={() => openMap(item.id)}
            className="flex w-full items-center justify-center gap-2.5 rounded-[14px] border border-[#3B82F6]/50 bg-[#3B82F6]/15 px-5 py-4 text-lg font-bold text-white transition hover:bg-[#3B82F6]/25 active:scale-[0.98]"
          >
            <MapPin className="h-6 w-6" strokeWidth={2.5} />
            Visa på karta
          </button>
        )}
        {isDriving && isEmergency && (
          <TeslaNavigationButtons
            size="large"
            hideMapsLink
            teslaLabel="Skicka till Tesla Navigation"
            target={{
              latitude: item.latitude,
              longitude: item.longitude,
              address: item.address,
            }}
          />
        )}
        {!isDriving && (
          <TeslaNavigationButtons
            size="large"
            target={{
              latitude: item.latitude,
              longitude: item.longitude,
              address: item.address,
            }}
          />
        )}
        {!isDriving && item.address && (
          <button
            type="button"
            onClick={() => void copyAddress()}
            className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-[#3A4048] bg-[#262B31] px-5 py-3.5 text-base font-semibold text-[#B0B6BE] transition hover:text-white active:scale-[0.98]"
          >
            {copied ? (
              <>
                <Check className="h-5 w-5 text-[#22C55E]" />
                Adress kopierad
              </>
            ) : (
              <>
                <Copy className="h-5 w-5" />
                Kopiera adress
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
  large,
  valueClassName,
}: {
  label: string;
  value: string;
  mono?: boolean;
  large?: boolean;
  valueClassName?: string;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-[#8A9099]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-semibold text-white",
          large ? "text-xl" : "text-base",
          mono && "font-mono",
          valueClassName
        )}
      >
        {value}
      </p>
    </div>
  );
}

interface TeslaLiveFeedPanelProps {
  items: LiveFeedItem[];
  privacyMode?: "admin" | "driving";
  layout?: "split" | "list" | "detail";
  selectedId?: string | null;
  onSelectId?: (id: string) => void;
}

function TeslaLiveFeedList({
  items,
  selectedId,
  onSelectId,
}: {
  items: LiveFeedItem[];
  selectedId: string | null;
  onSelectId: (id: string) => void;
}) {
  const { getReportAttention } = useAdminCommandCenter();

  return (
    <ul className="min-h-0 flex-1 overflow-y-auto">
      {items.map((item) => {
        const isSelected = item.id === selectedId;
        const attention = getReportAttention(item.id, item.type);

        return (
          <li key={item.id} className="border-b border-[#3A4048]/60 last:border-0">
            <button
              type="button"
              onClick={() => onSelectId(item.id)}
              className={cn(
                "relative w-full px-5 py-4 text-left transition-[transform,box-shadow,background-color] duration-700 ease-out active:scale-[0.99]",
                isSelected
                  ? "bg-[#3B82F6]/15 ring-1 ring-inset ring-[#3B82F6]/40"
                  : "hover:bg-[#2a3038]/60",
                attention.borderClass,
                attention.pulseClass,
                attention.showBgFlash && "admin-report-bg-flash"
              )}
            >
              <ReportAttentionBadge
                showNy={attention.showNyBadge}
                showAkut={attention.showAkutBadge}
              />

              <p className="pr-14 text-lg font-bold text-white">
                <span aria-hidden className="mr-1.5 inline-flex align-middle">
                  <ReportTypeIcon type={item.type} variant="badge" className="text-white" />
                </span>
                {item.type_label}
              </p>
              <p className="mt-1 text-base text-[#B0B6BE]">{item.location}</p>
              <p className="mt-0.5 text-sm font-mono text-[#8A9099]">
                {item.time_label}
              </p>
              <ReportCommentPreview
                comment={item.description}
                variant="tesla"
                className="mt-1 text-sm"
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function TeslaLiveFeedPanel({
  items,
  privacyMode = "admin",
  layout = "split",
  selectedId: controlledSelectedId,
  onSelectId,
}: TeslaLiveFeedPanelProps) {
  const { getReportAttention } = useAdminCommandCenter();
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);

  const selectedId = controlledSelectedId ?? internalSelectedId;
  const setSelectedId = onSelectId ?? setInternalSelectedId;

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return items.find((item) => item.id === selectedId) ?? null;
  }, [items, selectedId]);

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-center text-sm text-[#8A9099]">
          Inga aktiva rapporter
        </p>
      </div>
    );
  }

  if (layout === "list") {
    return (
      <TeslaLiveFeedList
        items={items}
        selectedId={selectedId}
        onSelectId={setSelectedId}
      />
    );
  }

  if (layout === "detail") {
    return (
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-[#1E2125]/40">
        {selected ? (
          <TeslaReportDetailPanel item={selected} privacyMode={privacyMode} />
        ) : (
          <TeslaReportDetailEmpty />
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-row">
      <ul className="min-h-0 w-[40%] shrink-0 overflow-y-auto border-r border-[#3A4048]/60">
        {items.map((item) => {
          const isSelected = item.id === selectedId;
          const attention = getReportAttention(item.id, item.type);

          return (
            <li key={item.id} className="border-b border-[#3A4048]/60 last:border-0">
              <button
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "relative w-full px-5 py-4 text-left transition-[transform,box-shadow,background-color] duration-700 ease-out active:scale-[0.99]",
                  isSelected
                    ? "bg-[#3B82F6]/15 ring-1 ring-inset ring-[#3B82F6]/40"
                    : "hover:bg-[#2a3038]/60",
                  attention.borderClass,
                  attention.pulseClass,
                  attention.showBgFlash && "admin-report-bg-flash"
                )}
              >
                <ReportAttentionBadge
                  showNy={attention.showNyBadge}
                  showAkut={attention.showAkutBadge}
                />

                <p className="pr-14 text-lg font-bold text-white">
                  <span aria-hidden className="mr-1.5 inline-flex align-middle">
                    <ReportTypeIcon type={item.type} variant="badge" className="text-white" />
                  </span>
                  {item.type_label}
                </p>
                <p className="mt-1 text-base text-[#B0B6BE]">{item.location}</p>
                <p className="mt-0.5 text-sm font-mono text-[#8A9099]">
                  {item.time_label}
                </p>
                <ReportCommentPreview
                  comment={item.description}
                  variant="tesla"
                  className="mt-1 text-sm"
                />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-[#1E2125]/40">
        {selected ? (
          <TeslaReportDetailPanel item={selected} privacyMode={privacyMode} />
        ) : (
          <TeslaReportDetailEmpty />
        )}
      </div>
    </div>
  );
}
