import { cn } from "@/lib/utils";

const VIEWBOX = "0 0 24 24";

/**
 * Filled silhouette — traffic officer in stop/direct pose (inspired by checkpoint icon).
 * Uses currentColor so parent text color controls fill (e.g. white on Tesla buttons).
 */
function AllVehicleCheckIconPaths() {
  return (
    <g fill="currentColor" stroke="none">
      {/* Peaked cap + brim */}
      <path d="M12 2.4 15.1 5.2H8.9L12 2.4Z" />
      <path d="M7.8 5.2h8.4v1.05H7.8V5.2Z" />
      <circle cx="12" cy="4.35" r="0.55" fill="currentColor" opacity="0.55" />

      {/* Head */}
      <ellipse cx="12" cy="8.15" rx="2.15" ry="2.05" />

      {/* Torso */}
      <path d="M9.15 10.35h5.7l.95 8.55H8.2l.95-8.55Z" />

      {/* Chest badge */}
      <path d="M13.55 11.85 14.95 13.35 13.55 14.55 12.15 13.35 13.55 11.85Z" opacity="0.45" />

      {/* Stop arm — raised palm (viewer's left) */}
      <path d="M9.35 10.55 7.55 10.75 5.85 3.65 8.05 3.35 9.55 9.15 9.35 10.55Z" />
      <path d="M6.35 3.55h2.05l.35 1.05H6.05l.3-1.05Z" opacity="0.35" />

      {/* Directing arm — extended horizontally (viewer's right) */}
      <path d="M14.65 11.05h7.35l.35 1.55H14.65v-1.55Z" />

      {/* Belt + holster */}
      <path d="M8.35 16.35h7.3v.95H8.35v-.95Z" opacity="0.35" />
      <path d="M7.65 16.55v2.45h1.75v-2.45H7.65Z" />
    </g>
  );
}

/** Compact path markup for Leaflet / HTML map markers. */
const OFFICER_SILHOUETTE_MARKUP = `<g fill="COLOR" stroke="none"><path d="M12 2.4 15.1 5.2H8.9L12 2.4Z"/><path d="M7.8 5.2h8.4v1.05H7.8V5.2Z"/><circle cx="12" cy="4.35" r="0.55" fill="COLOR" opacity="0.55"/><ellipse cx="12" cy="8.15" rx="2.15" ry="2.05"/><path d="M9.15 10.35h5.7l.95 8.55H8.2l.95-8.55Z"/><path d="M13.55 11.85 14.95 13.35 13.55 14.55 12.15 13.35 13.55 11.85Z" opacity="0.45"/><path d="M9.35 10.55 7.55 10.75 5.85 3.65 8.05 3.35 9.55 9.15 9.35 10.55Z"/><path d="M6.35 3.55h2.05l.35 1.05H6.05l.3-1.05Z" opacity="0.35"/><path d="M14.65 11.05h7.35l.35 1.55H14.65v-1.55Z"/><path d="M8.35 16.35h7.3v.95H8.35v-.95Z" opacity="0.35"/><path d="M7.65 16.55v2.45h1.75v-2.45H7.65Z"/></g>`;

export interface AllVehicleCheckIconProps {
  className?: string;
  /** Kept for API compatibility with ReportTypeIcon — silhouette uses fill, not stroke. */
  strokeWidth?: number;
}

export function AllVehicleCheckIcon({
  className,
}: AllVehicleCheckIconProps) {
  return (
    <svg
      viewBox={VIEWBOX}
      fill="none"
      className={cn("inline-block shrink-0", className)}
      aria-hidden
    >
      <AllVehicleCheckIconPaths />
    </svg>
  );
}

/** Inline SVG for Leaflet / HTML map markers. */
export function allVehicleCheckIconSvgMarkup(options?: {
  size?: number;
  color?: string;
  strokeWidth?: number;
}): string {
  const size = options?.size ?? 18;
  const color = options?.color ?? "#ffffff";
  const inner = OFFICER_SILHOUETTE_MARKUP.replaceAll("COLOR", color);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${VIEWBOX}" fill="none" aria-hidden="true">${inner}</svg>`;
}

export function isAllVehicleCheckReportType(typeOrId: string): boolean {
  return typeOrId === "all_vehicle_check";
}
