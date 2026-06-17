import { cn } from "@/lib/utils";

const VIEWBOX = "0 0 24 24";

/** Monochrome outline — authority checkpoint stopping all vehicles. */
function AllVehicleCheckIconPaths() {
  return (
    <>
      {/* Traffic cone */}
      <path d="M4.5 18.5 6.75 11 9 18.5Z" />
      <path d="M6 15.5h1.5" />
      <path d="M5.25 17.25h3" />
      {/* Vehicle */}
      <path d="M9.5 17.5h9.5v1.5H9.5z" />
      <path d="M10.5 17.5V15h6.5l1.5 2.5" />
      <path d="M11.5 15h4.5" />
      <circle cx="11.75" cy="19" r="0.95" fill="currentColor" stroke="none" />
      <circle cx="17.25" cy="19" r="0.95" fill="currentColor" stroke="none" />
      {/* Officer */}
      <path d="M19.25 7.75h2.5l-.75 1.75h-1z" />
      <circle cx="20.5" cy="10.25" r="1.35" />
      <path d="M19 12.25v5.25" />
      <path d="M17.75 17.5h5.5" />
      <path d="M18.75 13.5h3.5" />
    </>
  );
}

export interface AllVehicleCheckIconProps {
  className?: string;
  strokeWidth?: number;
}

export function AllVehicleCheckIcon({
  className,
  strokeWidth = 1.75,
}: AllVehicleCheckIconProps) {
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
  const strokeWidth = options?.strokeWidth ?? 1.6;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${VIEWBOX}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 18.5 6.75 11 9 18.5Z"/><path d="M6 15.5h1.5"/><path d="M5.25 17.25h3"/><path d="M9.5 17.5h9.5v1.5H9.5z"/><path d="M10.5 17.5V15h6.5l1.5 2.5"/><path d="M11.5 15h4.5"/><circle cx="11.75" cy="19" r="0.95" fill="${color}" stroke="none"/><circle cx="17.25" cy="19" r="0.95" fill="${color}" stroke="none"/><path d="M19.25 7.75h2.5l-.75 1.75h-1z"/><circle cx="20.5" cy="10.25" r="1.35"/><path d="M19 12.25v5.25"/><path d="M17.75 17.5h5.5"/><path d="M18.75 13.5h3.5"/></svg>`;
}

export function isAllVehicleCheckReportType(typeOrId: string): boolean {
  return typeOrId === "all_vehicle_check";
}
