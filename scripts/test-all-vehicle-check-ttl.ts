/**
 * Verifies all_vehicle_check TTL and expiry behavior.
 * Run: npx tsx scripts/test-all-vehicle-check-ttl.ts
 */
import {
  liveTtlMinutesForType,
  isAlertExpiredByTtl,
  isAlertCurrentlyLive,
} from "../src/lib/alert-ttl";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error("FAIL:", message);
    process.exit(1);
  }
  console.log("OK:", message);
}

const ttl = liveTtlMinutesForType("all_vehicle_check");
assert(ttl === 15, `TTL is 15 minutes (got ${ttl})`);

const freshCreatedAt = new Date(Date.now() - 14 * 60_000).toISOString();
const staleCreatedAt = new Date(Date.now() - 16 * 60_000).toISOString();

assert(
  !isAlertExpiredByTtl({ type: "all_vehicle_check", created_at: freshCreatedAt }),
  "14-minute-old report is not expired"
);

assert(
  isAlertExpiredByTtl({ type: "all_vehicle_check", created_at: staleCreatedAt }),
  "16-minute-old report is expired"
);

assert(
  isAlertCurrentlyLive({
    type: "all_vehicle_check",
    status: "active",
    admin_verified: true,
    created_at: freshCreatedAt,
  }),
  "Fresh report is currently live"
);

assert(
  !isAlertCurrentlyLive({
    type: "all_vehicle_check",
    status: "active",
    admin_verified: true,
    created_at: staleCreatedAt,
  }),
  "Stale report is not currently live"
);

console.log("\nAll all_vehicle_check TTL checks passed.");
