/**
 * Country platform architecture smoke tests (no test framework required).
 * Run: npm run test:country-platform
 */
import assert from "node:assert/strict";
import {
  getCountryConfig,
  DEFAULT_COUNTRY_CODE,
} from "../src/config/countries/index.ts";
import {
  PRIMARY_APEX_HOST,
  listParentDomains,
  listApexHosts,
} from "../src/config/domains.ts";
import {
  resolveCountryCodeFromHost,
  resolveCountryFromHost,
  isCountrySubdomainHost,
} from "../src/lib/country-routing/hostname.ts";

function check(
  name: string,
  actual: unknown,
  expected: unknown
): void {
  assert.equal(actual, expected, `${name}: expected ${expected}, got ${actual}`);
  console.log(`OK  ${name}`);
}

// Domains config
check("primary apex", PRIMARY_APEX_HOST, "cabradar.se");
assert.ok(listParentDomains().includes("cabradar.se"));
assert.ok(listParentDomains().includes("cabradar.com"));
assert.ok(listApexHosts().includes("www.cabradar.com"));
console.log("OK  multi-domain parents");

// Alias: uk → GB → gb.json
const viaUk = getCountryConfig("uk");
check("alias uk → code", viaUk.code, "GB");
check("alias uk → id", viaUk.id, "gb");
check("alias GB → id", getCountryConfig("GB").id, "gb");
check("alias gb → code", getCountryConfig("gb").code, "GB");

// Host routing — apex never implies TLD country; default only
const hostCases: [string, string][] = [
  ["cabradar.se", "SE"],
  ["www.cabradar.se", "SE"],
  ["cabradar.com", "SE"],
  ["www.cabradar.com", "SE"],
  ["is.cabradar.se", "IS"],
  ["is.cabradar.com", "IS"],
  ["no.cabradar.se", "NO"],
  ["dk.cabradar.com", "DK"],
  ["fi.cabradar.se", "FI"],
  ["de.cabradar.se", "DE"],
  ["uk.cabradar.se", "GB"],
  ["gb.cabradar.se", "GB"],
  ["uk.cabradar.com", "GB"],
  ["us.cabradar.se", "US"],
  ["localhost", "SE"],
  ["127.0.0.1", "SE"],
  ["xx.cabradar.se", "SE"],
  ["staging.cabradar.se", "SE"],
  ["unknown.example.org", "SE"],
];

for (const [host, code] of hostCases) {
  check(`host ${host}`, resolveCountryCodeFromHost(host), code);
}

check(
  "uk host loads gb config",
  resolveCountryFromHost("uk.cabradar.se").id,
  "gb"
);
check(
  "is host loads is config",
  resolveCountryFromHost("is.cabradar.com").id,
  "is"
);
check("apex is not country subdomain", isCountrySubdomainHost("cabradar.se"), false);
check("is subdomain flagged", isCountrySubdomainHost("is.cabradar.se"), true);
check("default country code", DEFAULT_COUNTRY_CODE, "SE");

console.log("\nALL COUNTRY PLATFORM TESTS PASSED");
