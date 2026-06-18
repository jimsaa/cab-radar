/**
 * Verifies taxi control vs instant report routing helpers.
 * Run: npx tsx scripts/test-report-flow-routing.ts
 */
import {
  isEmergencyReportButton,
  isTaxiControlReportButton,
  type ReportButtonId,
} from "../src/lib/report-alert-mapping";
import { DASHBOARD_REPORT_TYPES } from "../src/lib/dashboard-report-types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
  console.log("OK:", message);
}

const instantTypes = DASHBOARD_REPORT_TYPES.filter(
  (item) =>
    !isEmergencyReportButton(item.id) && !isTaxiControlReportButton(item.id)
).map((item) => item.id);

assert(isTaxiControlReportButton("taxikontroll"), "taxikontroll is taxi control");
assert(!isTaxiControlReportButton("laser"), "laser is not taxi control");
assert(isEmergencyReportButton("nod"), "nod is emergency");

for (const id of ["laser", "ko", "stopp", "olycka", "all_vehicle_check"] as ReportButtonId[]) {
  assert(instantTypes.includes(id), `${id} should be instant report`);
}

assert(!instantTypes.includes("taxikontroll"), "taxikontroll should not be instant");
assert(!instantTypes.includes("nod"), "nod should not be instant");

console.log("\nAll report flow routing checks passed.");
