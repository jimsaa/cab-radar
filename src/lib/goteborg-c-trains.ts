/** Göteborg C train departures via tagtider.net */

export const GoteborgC_SOURCE_URL =
  "https://tagtider.net/goteborg-c/avgangar/";
export const GoteborgC_USER_LABEL = "🚆 Göteborg C / SJ";
export const GoteborgC_DISRUPTION_SCAN_COUNT = 20;
export const GoteborgC_DISPLAY_COUNT = 5;
export const GoteborgC_CACHE_TTL_MS = 3 * 60 * 1000;

export type GoteborgCTrainStatus = "ok" | "delays" | "bus_replacement";

export interface GoteborgCDepartureFlags {
  busReplacement: boolean;
  cancelled: boolean;
  trackChange: boolean;
  significantDelay: boolean;
}

export interface GoteborgCDeparture {
  id: string;
  scheduledTime: string;
  scheduledAt: string;
  updatedTime: string | null;
  updatedAt: string | null;
  destination: string;
  track: string | null;
  trainNumber: string;
  operator: string;
  remark: string | null;
  delayMinutes: number | null;
  flags: GoteborgCDepartureFlags;
  highlight: boolean;
}

export interface GoteborgCTrainsSnapshot {
  available: boolean;
  fetchedAt: string;
  status: GoteborgCTrainStatus | "unavailable";
  disruptionCount: number;
  summaryLine: string;
  adminLabel: string;
  departures: GoteborgCDeparture[];
}

function parseCell(
  rowHtml: string,
  className: string
): { text: string; datetime: string | null } {
  const match = rowHtml.match(
    new RegExp(`class="${className}">([\\s\\S]*?)<\\/td>`, "i")
  );
  if (!match) return { text: "", datetime: null };

  const inner = match[1];
  const datetime = inner.match(/datetime="([^"]+)"/)?.[1] ?? null;
  const text = inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return { text, datetime };
}

function delayMinutes(
  scheduledAt: string,
  updatedAt: string | null
): number | null {
  if (!updatedAt) return null;
  const diff =
    (new Date(updatedAt).getTime() - new Date(scheduledAt).getTime()) / 60_000;
  if (!Number.isFinite(diff)) return null;
  return Math.round(diff);
}

function buildFlags(input: {
  rowClass: string | null;
  track: string | null;
  remark: string | null;
  delayMinutes: number | null;
}): GoteborgCDepartureFlags {
  const remark = input.remark ?? "";
  const track = input.track ?? "";
  const busReplacement =
    input.rowClass === "cancelled" ||
    track.toLowerCase() === "x" ||
    /buss/i.test(remark);
  const cancelled =
    input.rowClass === "cancelled" || track.toLowerCase() === "x";
  const trackChange = /spårändrat/i.test(remark);
  const significantDelay =
    input.rowClass === "delayed" ||
    (input.delayMinutes != null && input.delayMinutes > 10);

  return {
    busReplacement,
    cancelled,
    trackChange,
    significantDelay,
  };
}

export function parseTagtiderDepartures(html: string): GoteborgCDeparture[] {
  const rowRe = /<tr(?: class="([^"]*)")? id="(\d+)">([\s\S]*?)<\/tr>/gi;
  const departures: GoteborgCDeparture[] = [];

  for (const match of html.matchAll(rowRe)) {
    const [, rowClass, id, body] = match;
    const scheduled = parseCell(body, "time");
    const destination = parseCell(body, "transfer");
    const updated = parseCell(body, "new");
    const trackCell = parseCell(body, "track");
    const trainNumber = parseCell(body, "train");
    const operator = parseCell(body, "type");
    const remarkCell = parseCell(body, "comment");

    if (!scheduled.datetime || !destination.text) continue;

    const track =
      trackCell.text && trackCell.text.toLowerCase() !== "x"
        ? trackCell.text
        : trackCell.text.toLowerCase() === "x"
          ? null
          : trackCell.text || null;

    const remark = remarkCell.text || null;
    const mins = delayMinutes(scheduled.datetime, updated.datetime);
    const flags = buildFlags({
      rowClass: rowClass ?? null,
      track: trackCell.text || null,
      remark,
      delayMinutes: mins,
    });

    departures.push({
      id,
      scheduledTime: scheduled.text || scheduled.datetime.slice(11, 16),
      scheduledAt: scheduled.datetime,
      updatedTime: updated.text || null,
      updatedAt: updated.datetime,
      destination: destination.text,
      track,
      trainNumber: trainNumber.text,
      operator: operator.text,
      remark,
      delayMinutes: mins,
      flags,
      highlight:
        flags.busReplacement ||
        flags.cancelled ||
        flags.trackChange ||
        flags.significantDelay,
    });
  }

  return departures;
}

export function upcomingDepartures(
  departures: GoteborgCDeparture[],
  limit: number,
  graceMs = 60_000
): GoteborgCDeparture[] {
  const cutoff = Date.now() - graceMs;
  return departures
    .filter((d) => new Date(d.scheduledAt).getTime() >= cutoff)
    .slice(0, limit);
}

function isDisrupted(d: GoteborgCDeparture): boolean {
  return d.highlight;
}

export function buildGoteborgCTrainsSnapshot(
  departures: GoteborgCDeparture[],
  fetchedAt = new Date().toISOString()
): GoteborgCTrainsSnapshot {
  const scan = upcomingDepartures(
    departures,
    GoteborgC_DISRUPTION_SCAN_COUNT
  );
  const display = scan.slice(0, GoteborgC_DISPLAY_COUNT);
  const disrupted = scan.filter(isDisrupted);
  const disruptionCount = disrupted.length;
  const hasBusReplacement = disrupted.some((d) => d.flags.busReplacement);

  let status: GoteborgCTrainStatus = "ok";
  if (hasBusReplacement) {
    status = "bus_replacement";
  } else if (disruptionCount > 0) {
    status = "delays";
  }

  let summaryLine: string;
  if (hasBusReplacement) {
    summaryLine = "Bussersättning pågår";
  } else if (disruptionCount > 0) {
    summaryLine = `${disruptionCount} störning${disruptionCount === 1 ? "" : "ar"}`;
  } else {
    summaryLine = "Trafiken flyter";
  }

  const adminLabel =
    status === "bus_replacement"
      ? "Göteborg C Bussersättning"
      : status === "delays"
        ? "Göteborg C Förseningar"
        : "Göteborg C OK";

  return {
    available: true,
    fetchedAt,
    status,
    disruptionCount,
    summaryLine,
    adminLabel,
    departures: display,
  };
}

export function unavailableGoteborgCSnapshot(
  fetchedAt = new Date().toISOString()
): GoteborgCTrainsSnapshot {
  return {
    available: false,
    fetchedAt,
    status: "unavailable",
    disruptionCount: 0,
    summaryLine: "ej tillgänglig",
    adminLabel: "Göteborg C ej tillgänglig",
    departures: [],
  };
}

export function formatGoteborgCDelayLabel(departure: GoteborgCDeparture): string {
  if (departure.flags.busReplacement || departure.flags.cancelled) {
    return "Inställd";
  }
  if (departure.delayMinutes == null || departure.delayMinutes <= 0) {
    return "I tid";
  }
  return `+${departure.delayMinutes} min`;
}

export function goteborgCDepartureStatusLabel(
  departure: GoteborgCDeparture
): string {
  const parts: string[] = [];
  if (departure.remark) parts.push(departure.remark);
  if (departure.flags.busReplacement && !/buss/i.test(departure.remark ?? "")) {
    parts.push("Bussersättning");
  }
  if (parts.length === 0 && departure.delayMinutes != null && departure.delayMinutes > 0) {
    parts.push(`Försening ${departure.delayMinutes} min`);
  }
  return parts.join(" · ") || "—";
}

export function goteborgCUserTileLine(snapshot: GoteborgCTrainsSnapshot): string {
  if (!snapshot.available) {
    return "🚆 Göteborg C ej tillgänglig";
  }
  return `🚆 Göteborg C – ${snapshot.summaryLine}`;
}
