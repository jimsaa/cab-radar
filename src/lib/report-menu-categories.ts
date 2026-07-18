import type { ReportButtonId } from "./report-alert-mapping";
import {
  DASHBOARD_REPORT_TYPES,
  type DashboardReportType,
} from "./dashboard-report-types";

/** Accordion categories for Tesla View + Admin quick-report menus. */
export type ReportMenuCategoryId = "police" | "traffic" | "taxi";

export interface ReportMenuCategory {
  id: ReportMenuCategoryId;
  label: string;
  icon: string;
  /** Report button ids — add new types here without redesigning the menu. */
  reportIds: ReportButtonId[];
}

/**
 * Category → report types.
 * Mobile/App dashboard does not use this — only Tesla + Admin.
 */
export const REPORT_MENU_CATEGORIES: ReportMenuCategory[] = [
  {
    id: "police",
    label: "Polis & Kontroller",
    icon: "🚔",
    reportIds: [
      "taxikontroll",
      "laser",
      "all_vehicle_check",
      // future: civil_check
    ],
  },
  {
    id: "traffic",
    label: "Trafik",
    icon: "🚦",
    reportIds: ["ko", "stopp", "olycka"],
  },
  {
    id: "taxi",
    label: "Taxi",
    icon: "🚖",
    reportIds: [
      "need_cars",
      "nod",
      // future: taxi-specific features
    ],
  },
];

export function reportsForCategory(
  category: ReportMenuCategory
): DashboardReportType[] {
  const byId = new Map(DASHBOARD_REPORT_TYPES.map((r) => [r.id, r]));
  return category.reportIds
    .map((id) => byId.get(id))
    .filter((r): r is DashboardReportType => Boolean(r));
}
