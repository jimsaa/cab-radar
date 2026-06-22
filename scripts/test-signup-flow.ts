/**
 * Signup profile save helpers — routing and payload shape checks.
 * Run: npx tsx scripts/test-signup-flow.ts
 */
import {
  isEmergencyReportButton,
  isTaxiControlReportButton,
} from "../src/lib/report-alert-mapping";
import { validateNickname, normalizeNickname } from "../src/lib/driver-nickname";
import { isValidLicence, normalizeLicenceInput } from "../src/lib/licence.shared";
import { formatSignupAuthError } from "../src/lib/signup-route-errors";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
  console.log("OK:", message);
}

assert(!isTaxiControlReportButton("laser"), "laser is not taxi control");
assert(isTaxiControlReportButton("taxikontroll"), "taxikontroll detected");
assert(isEmergencyReportButton("nod"), "nod is emergency");

const nickname = normalizeNickname("Mac Attack");
assert(nickname === "Mac Attack", "nickname normalized");
assert(validateNickname(nickname) === null, "nickname valid");

const licence = normalizeLicenceInput("1234567890");
assert(isValidLicence(licence), "licence valid");

const devAuthError = formatSignupAuthError(
  'null value in column "cabradar_user_id" violates not-null constraint'
);
assert(
  devAuthError.includes("cabradar_user_id") || devAuthError.includes("registreringskolumner"),
  "auth trigger NOT NULL surfaces as schema error in dev"
);

console.log("\nAll signup flow checks passed.");
