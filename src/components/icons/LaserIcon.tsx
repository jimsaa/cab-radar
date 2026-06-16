import { cn } from "@/lib/utils";

const VIEWBOX = "0 0 24 24";

/** Monochrome outline laser speed gun — police LIDAR, not satellite dish. */
function LaserIconPaths() {
  return (
    <>
      {/* Laser beams from lens */}
      <path d="M17.5 8.5H22" />
      <path d="M17.5 10H21" />
      <path d="M17.5 11.5H20" />
      {/* Viewfinder */}
      <path d="M8 6.5H13V8.5H8Z" />
      {/* Main body */}
      <path d="M4 8.5H17.5V13.5H4Z" />
      {/* Lens */}
      <circle cx="16.25" cy="11" r="1.1" fill="currentColor" stroke="none" />
      {/* Grip */}
      <path d="M6 13.5V17.5" />
      <path d="M4.5 17.5H7.5" />
      <path d="M4.5 13.5H7.5" />
      {/* Trigger */}
      <path d="M8.25 14.75V16.25" />
    </>
  );
}

export interface LaserIconProps {
  className?: string;
  /** Stroke width — slightly heavier for small Tesla sizes */
  strokeWidth?: number;
}

export function LaserIcon({ className, strokeWidth = 1.75 }: LaserIconProps) {
  return (
    <svg
      viewBox={VIEWBOX}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("inline-block shrink-0", className)}
      aria-hidden
    >
      <LaserIconPaths />
    </svg>
  );
}

/** Inline SVG for Leaflet / HTML map markers. */
export function laserIconSvgMarkup(options?: {
  size?: number;
  color?: string;
  strokeWidth?: number;
}): string {
  const size = options?.size ?? 18;
  const color = options?.color ?? "#ffffff";
  const strokeWidth = options?.strokeWidth ?? 1.6;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${VIEWBOX}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 8.5H22"/><path d="M17.5 10H21"/><path d="M17.5 11.5H20"/><path d="M8 6.5H13V8.5H8Z"/><path d="M4 8.5H17.5V13.5H4Z"/><circle cx="16.25" cy="11" r="1.1" fill="${color}" stroke="none"/><path d="M6 13.5V17.5"/><path d="M4.5 17.5H7.5"/><path d="M4.5 13.5H7.5"/><path d="M8.25 14.75V16.25"/></svg>`;
}

export function isLaserReportType(typeOrId: string): boolean {
  return typeOrId === "laser";
}
