/** Report types rendered with custom SVG icons instead of emoji. */
export const SVG_REPORT_TYPES = [
  "laser",
  "all_vehicle_check",
  "need_cars",
] as const;

export type SvgReportType = (typeof SVG_REPORT_TYPES)[number];

export function isSvgReportType(typeOrId: string): typeOrId is SvgReportType {
  return (SVG_REPORT_TYPES as readonly string[]).includes(typeOrId);
}
