"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { TeslaNavigationButtons } from "@/components/admin/TeslaNavigationButtons";
import type { LiveFeedItem } from "@/lib/admin-command-center";
import { ReportCommentPreview } from "@/components/reports/ReportCommentPreview";
import { formatCoordinate } from "@/lib/tesla-navigation";
import { cn } from "@/lib/utils";

function TeslaReportDetail({
  item,
  onBack,
}: {
  item: LiveFeedItem;
  onBack: () => void;
}) {
  const notes = item.description?.trim();

  return (
    <div className="flex min-h-0 flex-col">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 flex items-center gap-1 text-sm font-medium text-[#8A9099] transition hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        Tillbaka
      </button>

      <p className="text-xs font-bold uppercase tracking-widest text-[#8A9099]">
        Rapport
      </p>
      <h3 className="mt-1 text-2xl font-bold text-white">{item.type_label}</h3>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <DetailCell label="Förare" value={item.driver_name} />
        <DetailCell label="Tid" value={item.timestamp_label} mono />
        <DetailCell label="Adress" value={item.address} className="sm:col-span-2" />
        <DetailCell
          label="Latitud"
          value={formatCoordinate(item.latitude)}
          mono
        />
        <DetailCell
          label="Longitud"
          value={formatCoordinate(item.longitude)}
          mono
        />
      </div>

      {notes && (
        <div className="mt-4 rounded-[12px] bg-[#1B1E22]/80 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8A9099]">
            Anteckningar
          </p>
          <p className="mt-1 text-sm text-[#B0B6BE]">{notes}</p>
        </div>
      )}

      <div className="mt-6">
        <TeslaNavigationButtons
          size="large"
          target={{
            latitude: item.latitude,
            longitude: item.longitude,
            address: item.address,
          }}
        />
      </div>
    </div>
  );
}

function DetailCell({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-[12px] bg-[#1B1E22]/80 px-3 py-2", className)}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8A9099]">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-sm font-medium text-white",
          mono && "font-mono text-xs"
        )}
      >
        {value}
      </p>
    </div>
  );
}

interface TeslaLiveFeedPanelProps {
  items: LiveFeedItem[];
}

export function TeslaLiveFeedPanel({ items }: TeslaLiveFeedPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((item) => item.id === selectedId) ?? null;

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-center text-sm text-[#8A9099]">
          Inga aktiva rapporter
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ul
        className={cn(
          "min-h-0 overflow-y-auto",
          selected ? "w-[42%] shrink-0 border-r border-[#3A4048]/60" : "w-full"
        )}
      >
        {items.map((item) => {
          const isSelected = item.id === selectedId;
          return (
            <li key={item.id} className="border-b border-[#3A4048]/60 last:border-0">
              <button
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  "w-full px-5 py-4 text-left transition active:scale-[0.99]",
                  isSelected
                    ? "bg-[#3B82F6]/15 ring-1 ring-inset ring-[#3B82F6]/40"
                    : "hover:bg-[#2a3038]/60"
                )}
              >
                <p className="text-lg font-bold text-white">{item.type_label}</p>
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

      {selected && (
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <TeslaReportDetail item={selected} onBack={() => setSelectedId(null)} />
        </div>
      )}
    </div>
  );
}
