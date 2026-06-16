import { alertTypeLabel } from "./constants";
import type { DriverAlert } from "./types/database";

export const TEST_MODE_BANNER_TITLE = "🧪 TEST MODE";
export const TEST_MODE_BANNER_SUBTITLE =
  "Rapporter skickas inte till det riktiga nätverket.";
export const TEST_EMERGENCY_DISCLAIMER =
  "🧪 TESTLÄGE – Ingen verklig nödsignal skickas.";
export const DISABLE_TEST_MODE_CONFIRM =
  "Du lämnar testläget och rapporterar nu till det riktiga nätverket.";
export function isTestAlert(
  alert: Pick<DriverAlert, "is_test"> | { is_test?: boolean }
): boolean {
  return Boolean(alert.is_test);
}

/** Display label with optional TEST prefix. */
export function formatTestAlertLabel(
  label: string,
  isTest: boolean
): string {
  if (!isTest) return label;
  if (label.startsWith("🧪 TEST")) return label;
  return `🧪 TEST – ${label}`;
}

export function formatTestAlertTypeLabel(
  type: string,
  isTest: boolean
): string {
  return formatTestAlertLabel(alertTypeLabel(type), isTest);
}

export function formatTestAlertTitle(
  title: string,
  isTest: boolean
): string {
  return formatTestAlertLabel(title, isTest);
}
