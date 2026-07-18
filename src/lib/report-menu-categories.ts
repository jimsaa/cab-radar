import type { ReportButtonId } from "./report-alert-mapping";
import {
  DASHBOARD_REPORT_TYPES,
  type DashboardReportType,
} from "./dashboard-report-types";
import { getActiveCountry } from "@/config/countries";
import { t } from "@/lib/i18n";
import type { ReportMenuUtilityId } from "./report-menu-categories.types";

export type { ReportMenuUtilityId } from "./report-menu-categories.types";

/** Accordion categories for Tesla View + Admin quick-report menus. */
export type ReportMenuCategoryId = "police" | "traffic" | "taxi";

export interface ReportMenuCategory {
  id: ReportMenuCategoryId;
  label: string;
  icon: string;
  reportIds: ReportButtonId[];
  utilityIds?: ReportMenuUtilityId[];
}

/**
 * Build categories from the active country configuration.
 * Adding/removing report types per country = edit country JSON only.
 */
export function getReportMenuCategories(
  countryCode?: string | null
): ReportMenuCategory[] {
  const country = getActiveCountry(countryCode);
  const enabledButtons = new Set(country.enabledReportButtons);
  const enabledUtilities = new Set(country.enabledUtilities);

  return country.reportMenuCategories.map((cat) => ({
    id: cat.id as ReportMenuCategoryId,
    label: t(cat.labelKey, { countryCode: country.code }),
    icon: cat.icon,
    reportIds: cat.reportButtons.filter((id): id is ReportButtonId =>
      enabledButtons.has(id)
    ) as ReportButtonId[],
    utilityIds: (cat.utilities ?? []).filter((id) =>
      enabledUtilities.has(id)
    ) as ReportMenuUtilityId[],
  }));
}

/** @deprecated Prefer getReportMenuCategories() — kept for callers that expect a const. */
export const REPORT_MENU_CATEGORIES: ReportMenuCategory[] =
  getReportMenuCategories();

export function reportsForCategory(
  category: ReportMenuCategory
): DashboardReportType[] {
  const byId = new Map(DASHBOARD_REPORT_TYPES.map((r) => [r.id, r]));
  return category.reportIds
    .map((id) => byId.get(id))
    .filter((r): r is DashboardReportType => Boolean(r));
}
