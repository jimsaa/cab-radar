export const APP_NAME = "CabRadar";
export const APP_SLOGAN = "Den digitala co-piloten för taxiförare.";
export const APP_HEADER_TAGLINE = "Den digitala co-piloten för taxiförare.";

export {
  ALERT_TYPES,
  ALERT_TYPE_LABELS,
  ALERT_TYPE_ICONS,
  ALERT_TYPE_DESCRIPTIONS,
  alertTypeLabel,
  alertTypeIcon,
  alertTypeDisplayLabel,
  QUEUE_TRAFFIC_ICON,
  isCurrentAlertType,
  ALERT_TYPES_NEEDING_GPS,
  ALERT_TYPES_NEEDING_ADMIN,
  PUSH_NOTIFICATION_TYPES,
  type AlertType,
  type StoredAlertType,
} from "./alert-types";

import type { AlertType } from "./alert-types";
import { ALERT_TYPE_LABELS } from "./alert-types";

export const BANNER_SLOTS = [
  "dashboard_top",
  "deals_page",
  "alert_feed",
] as const;

export type BannerSlot = (typeof BANNER_SLOTS)[number];

export const BANNER_SLOT_LABELS: Record<BannerSlot, string> = {
  dashboard_top: "Start",
  deals_page: "Erbjudanden",
  alert_feed: "Flöde",
};

export function googleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function defaultAlertTitle(type: AlertType): string {
  return ALERT_TYPE_LABELS[type];
}

export const HELP_CATEGORIES = [
  "taximeter",
  "card_terminal",
  "documents_regulations",
  "vehicle_issues",
  "ev_charging",
  "customer_situations",
  "school_trips_medical_transport",
  "quick_guides",
] as const;

export type HelpCategory = (typeof HELP_CATEGORIES)[number];

export const HELP_CATEGORY_LABELS: Record<HelpCategory, string> = {
  taximeter: "Taxameter",
  card_terminal: "Kortterminal",
  documents_regulations: "Dokument & regler",
  vehicle_issues: "Bilproblem",
  ev_charging: "El-laddning",
  customer_situations: "Kundsituationer",
  school_trips_medical_transport: "Skol- & sjukresor",
  quick_guides: "Snabbguider",
};

export const HELP_CATEGORY_ICONS: Record<HelpCategory, string> = {
  taximeter: "📟",
  card_terminal: "💳",
  documents_regulations: "📋",
  vehicle_issues: "🔧",
  ev_charging: "⚡",
  customer_situations: "👤",
  school_trips_medical_transport: "🏫",
  quick_guides: "📖",
};

/** Nav & gemensamma etiketter */
export const NAV = {
  radar: APP_NAME,
  map: "Karta",
  feed: "Flöde",
  live: "LIVE",
  deals: "Erbjudanden",
  help: "Hjälp",
  settings: "Inställningar",
  civilkoll: "Civilkoll",
  admin: "Admin",
} as const;
