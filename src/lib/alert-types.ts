export const ALERT_TYPES = [
  "total_stop",
  "slow_traffic",
  "accident",
  "taxi_emergency",
  "taxi_info",
  "traffic_control",
  "laser",
] as const;

export type AlertType = (typeof ALERT_TYPES)[number];

/** Legacy DB values — display only for older alerts in feed */
export const LEGACY_ALERT_TYPES = [
  "total_stop_accident",
  "roadwork",
  "hazard_on_road",
  "unsafe_pickup_area",
  "taxi_queue_hotspot",
  "ev_charger",
  "restroom_break",
  "general_driver_tip",
] as const;

export type LegacyAlertType = (typeof LEGACY_ALERT_TYPES)[number];

export type StoredAlertType = AlertType | LegacyAlertType;

/** Three cars in a row — traffic queue / Kö */
export const QUEUE_TRAFFIC_ICON = "🚗🚗🚗";

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  total_stop: "Stopp",
  slow_traffic: "Kö",
  accident: "Olycka",
  taxi_emergency: "Taxi i nöd",
  taxi_info: "Taxiinfo",
  traffic_control: "Taxikontroll",
  laser: "Laser",
};

export const ALERT_TYPE_ICONS: Record<AlertType, string> = {
  total_stop: "🚧",
  slow_traffic: QUEUE_TRAFFIC_ICON,
  accident: "🚑",
  taxi_emergency: "🆘",
  taxi_info: "📋",
  traffic_control: "🚕",
  laser: "📡",
};

export const ALERT_TYPE_DESCRIPTIONS: Record<AlertType, string> = {
  total_stop: "Vägavstängning, stillastående trafik.",
  slow_traffic: "Trafikstockning, långsam trafik.",
  accident: "Trafikolycka eller incident.",
  taxi_emergency: "Nödläge – jag behöver hjälp.",
  taxi_info: "Viktig information för taxiförare.",
  traffic_control: "Poliskontroll eller annan kontrollplats.",
  laser: "Laser, fartkamera eller polis med laser.",
};

const LEGACY_LABELS: Record<LegacyAlertType, string> = {
  total_stop_accident: "Stopp",
  roadwork: "Vägarbete",
  hazard_on_road: "Fara",
  unsafe_pickup_area: "Osäker plats",
  taxi_queue_hotspot: "Taxiplats",
  ev_charger: "Laddare",
  restroom_break: "Rastplats",
  general_driver_tip: "Tips",
};

const LEGACY_ICONS: Record<LegacyAlertType, string> = {
  total_stop_accident: "🚧",
  roadwork: "🚧",
  hazard_on_road: "⚠️",
  unsafe_pickup_area: "🚫",
  taxi_queue_hotspot: "🚕",
  ev_charger: "⚡",
  restroom_break: "🚻",
  general_driver_tip: "💡",
};

export function alertTypeLabel(type: string): string {
  if (type in ALERT_TYPE_LABELS) {
    return ALERT_TYPE_LABELS[type as AlertType];
  }
  if (type in LEGACY_LABELS) {
    return LEGACY_LABELS[type as LegacyAlertType];
  }
  return type;
}

export function alertTypeIcon(type: string): string {
  if (type in ALERT_TYPE_ICONS) {
    return ALERT_TYPE_ICONS[type as AlertType];
  }
  if (type in LEGACY_ICONS) {
    return LEGACY_ICONS[type as LegacyAlertType];
  }
  return "⚠️";
}

export function isCurrentAlertType(type: string): type is AlertType {
  return (ALERT_TYPES as readonly string[]).includes(type);
}

export const ALERT_TYPES_NEEDING_GPS: AlertType[] = [
  "total_stop",
  "slow_traffic",
  "accident",
  "taxi_emergency",
  "traffic_control",
  "laser",
];

export const ALERT_TYPES_NEEDING_ADMIN: AlertType[] = ["taxi_info"];

export const PUSH_NOTIFICATION_TYPES: AlertType[] = [
  "total_stop",
  "accident",
  "taxi_emergency",
  "traffic_control",
  "laser",
];
