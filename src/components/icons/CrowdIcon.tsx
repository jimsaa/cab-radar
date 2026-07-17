import { cn } from "@/lib/utils";

const VIEWBOX = "0 0 24 24";

/**
 * Crowd silhouette — five people (3 front / 2 back), matching the CabRadar
 * "Bilar behövs" high-demand icon. Uses currentColor for white Tesla styling.
 */
function CrowdIconPaths() {
  return (
    <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
      {/* Back row — left */}
      <circle cx="8.2" cy="6.2" r="2.05" />
      <path d="M5.1 14.2c0-2.35 1.4-4.25 3.1-4.25s3.1 1.9 3.1 4.25" />
      {/* Back row — right */}
      <circle cx="15.8" cy="6.2" r="2.05" />
      <path d="M12.7 14.2c0-2.35 1.4-4.25 3.1-4.25s3.1 1.9 3.1 4.25" />
      {/* Front row — left */}
      <circle cx="4.6" cy="9.6" r="2.2" />
      <path d="M1.35 18.4c0-2.55 1.45-4.6 3.25-4.6s3.25 2.05 3.25 4.6" />
      {/* Front row — center */}
      <circle cx="12" cy="9.4" r="2.35" />
      <path d="M8.5 18.6c0-2.7 1.55-4.9 3.5-4.9s3.5 2.2 3.5 4.9" />
      {/* Front row — right */}
      <circle cx="19.4" cy="9.6" r="2.2" />
      <path d="M16.15 18.4c0-2.55 1.45-4.6 3.25-4.6s3.25 2.05 3.25 4.6" />
    </g>
  );
}

export interface CrowdIconProps {
  className?: string;
  strokeWidth?: number;
}

export function CrowdIcon({ className, strokeWidth = 1.75 }: CrowdIconProps) {
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
      <CrowdIconPaths />
    </svg>
  );
}

/** Inline SVG for Leaflet / HTML map markers. */
export function crowdIconSvgMarkup(options?: {
  size?: number;
  color?: string;
  strokeWidth?: number;
}): string {
  const size = options?.size ?? 18;
  const color = options?.color ?? "#ffffff";
  const strokeWidth = options?.strokeWidth ?? 1.6;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${VIEWBOX}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8.2" cy="6.2" r="2.05"/><path d="M5.1 14.2c0-2.35 1.4-4.25 3.1-4.25s3.1 1.9 3.1 4.25"/><circle cx="15.8" cy="6.2" r="2.05"/><path d="M12.7 14.2c0-2.35 1.4-4.25 3.1-4.25s3.1 1.9 3.1 4.25"/><circle cx="4.6" cy="9.6" r="2.2"/><path d="M1.35 18.4c0-2.55 1.45-4.6 3.25-4.6s3.25 2.05 3.25 4.6"/><circle cx="12" cy="9.4" r="2.35"/><path d="M8.5 18.6c0-2.7 1.55-4.9 3.5-4.9s3.5 2.2 3.5 4.9"/><circle cx="19.4" cy="9.6" r="2.2"/><path d="M16.15 18.4c0-2.55 1.45-4.6 3.25-4.6s3.25 2.05 3.25 4.6"/></svg>`;
}

export function isNeedCarsReportType(typeOrId: string): boolean {
  return typeOrId === "need_cars";
}
