import { alertTypeIcon, type AlertType } from "./alert-types";

export const VALIDATION_REJECT_THRESHOLD = 2;
export const VALIDATION_POINTS = 2;

/** Alert types that show pass-by validation prompts */
export const VALIDATION_ELIGIBLE_TYPES = [
  "slow_traffic",
  "total_stop",
  "taxi_info",
  "accident",
] as const satisfies readonly AlertType[];

export type ValidationEligibleType = (typeof VALIDATION_ELIGIBLE_TYPES)[number];

/** User must pass within this radius (m) before prompt triggers */
export const VALIDATION_PASS_RADIUS_M = 150;
/** Prompt when driver is this far past the alert (m) */
export const VALIDATION_PROMPT_MIN_M = 300;
export const VALIDATION_PROMPT_MAX_M = 500;
/** Auto-dismiss prompt after ms */
export const VALIDATION_PROMPT_DISMISS_MS = 15000;

export const VALIDATION_UNIFIED_PROMPT = "Är händelsen fortfarande kvar?";

export type ValidationResponse = "yes" | "no" | "unknown";

export type AlertValidationStatus = "active" | "confirmed" | "resolved";

export function isValidationEligibleType(type: string): type is ValidationEligibleType {
  return (VALIDATION_ELIGIBLE_TYPES as readonly string[]).includes(type);
}

export function validationPromptForType(type: string): string | null {
  if (!isValidationEligibleType(type)) return null;
  return `${alertTypeIcon(type)} ${VALIDATION_UNIFIED_PROMPT}`;
}

export function rejectionVoteLabel(count: number): string | null {
  if (count === 1) return "1 av 2 borttagningsröster registrerad.";
  return null;
}

export const ALERT_RESOLVED_LABEL = "✓ Händelsen verkar vara avslutad.";
