import type { ReportButtonId } from "./report-alert-mapping";

import { alertTypeForReportButton } from "./report-alert-mapping";

import { QUEUE_TRAFFIC_ICON, type AlertType } from "./alert-types";



export type { ReportButtonId };



export interface DashboardReportType {

  /** Driver-facing button id (stopp, ko, laser, …) */

  id: ReportButtonId;

  label: string;

  description: string;

  icon: string;

  borderClass: string;

  glowClass: string;

  /** Silent distress — neutral styling on dashboard */

  discreet?: boolean;

}



export function reportAlertType(item: DashboardReportType): AlertType {

  return alertTypeForReportButton(item.id);

}



export const DASHBOARD_REPORT_TYPES: DashboardReportType[] = [

  {

    id: "taxikontroll",

    label: "Taxikontroll",

    description: "Poliskontroll eller annan kontrollplats.",

    icon: "🚕",

    borderClass: "border-yellow-500/50",

    glowClass: "shadow-yellow-500/10",

  },

  {

    id: "laser",

    label: "Laser",

    description: "Laser, fartkamera eller polis med laser.",

    icon: "",

    borderClass: "border-purple-500/50",

    glowClass: "shadow-purple-500/10",

  },

  {

    id: "ko",

    label: "Kö",

    description: "Trafikstockning, långsam trafik.",

    icon: QUEUE_TRAFFIC_ICON,

    borderClass: "border-orange-500/50",

    glowClass: "shadow-orange-500/10",

  },

  {

    id: "stopp",

    label: "Stopp",

    description: "Vägavstängning, stillastående trafik.",

    icon: "🚧",

    borderClass: "border-red-500/50",

    glowClass: "shadow-red-500/10",

  },

  {

    id: "olycka",

    label: "Olycka",

    description: "Trafikolycka eller incident.",

    icon: "🚑",

    borderClass: "border-sky-500/50",

    glowClass: "shadow-sky-500/10",

  },

  {

    id: "nod",

    label: "Taxi i nöd",

    description: "Diskret säkerhetsfunktion.",

    icon: "",

    borderClass: "border-card-border",

    glowClass: "",

    discreet: true,

  },

];


