/**
 * Verifies taxi control vs instant report routing helpers.
 * Run: npx tsx scripts/test-report-flow-routing.ts
 */
import {
  isEmergencyReportButton,
  isOptionalCommentReportButton,
  isTaxiControlReportButton,
  type ReportButtonId,
} from "../src/lib/report-alert-mapping";
import { DASHBOARD_REPORT_TYPES } from "../src/lib/dashboard-report-types";
import { liveTtlMinutesForType } from "../src/lib/alert-ttl";
import { alertTypeLabel } from "../src/lib/alert-types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
  console.log("OK:", message);
}

const instantTypes = DASHBOARD_REPORT_TYPES.filter(
  (item) =>
    !isEmergencyReportButton(item.id) && !isOptionalCommentReportButton(item.id)
).map((item) => item.id);

assert(isTaxiControlReportButton("taxikontroll"), "taxikontroll is taxi control");
assert(!isTaxiControlReportButton("laser"), "laser is not taxi control");
assert(isEmergencyReportButton("nod"), "nod is emergency");
assert(isOptionalCommentReportButton("taxikontroll"), "taxikontroll has comment modal");
assert(isOptionalCommentReportButton("need_cars"), "need_cars has comment modal");
assert(!isOptionalCommentReportButton("laser"), "laser has no comment modal");

for (const id of ["laser", "ko", "stopp", "olycka", "all_vehicle_check"] as ReportButtonId[]) {
  assert(instantTypes.includes(id), `${id} should be instant report`);
}

assert(!instantTypes.includes("taxikontroll"), "taxikontroll should not be instant");
assert(!instantTypes.includes("need_cars"), "need_cars should not be instant");
assert(!instantTypes.includes("nod"), "nod should not be instant");

assert(
  DASHBOARD_REPORT_TYPES.some((item) => item.id === "need_cars"),
  "need_cars is in dashboard report types"
);
assert(alertTypeLabel("need_cars") === "Bilar behövs", "need_cars Swedish label");
assert(liveTtlMinutesForType("need_cars") === 15, "need_cars TTL is 15 minutes");

console.log("\nAll report flow routing checks passed.");

