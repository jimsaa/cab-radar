/** Temporary Tesla navigation diagnostics — enable via ?teslaDebug=1 or localStorage. */

export type TeslaUrlVariant = "A" | "B" | "C" | "scheme";

export type TeslaNavMethod =
  | "anchor_click"
  | "location_href"
  | "window_open_self"
  | "window_open_blank";

export interface TeslaNavigationAttempt {
  variant: TeslaUrlVariant;
  method: TeslaNavMethod;
  url: string;
  startedAt: number;
  endedAt: number | null;
  success: boolean;
  reason: string;
}

export interface TeslaNavigationSession {
  lat: number;
  lng: number;
  userAgent: string;
  isTeslaBrowser: boolean;
  teslaDebugEnabled: boolean;
  probeResults: TeslaUrlProbeResult[] | null;
  attempts: TeslaNavigationAttempt[];
  primaryUrl: string;
  outcome: "pending" | "success" | "fallback";
  outcomeReason: string;
}

export interface TeslaUrlProbeResult {
  variant: TeslaUrlVariant;
  url: string;
  status: number;
  ok: boolean;
  error?: string;
}

const DEBUG_STORAGE_KEY = "cabradar_tesla_debug";
const SESSION_KEY = "__cabradarTeslaNavSession";

export function isTeslaBrowserUserAgent(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return (
    ua.includes("qtcarbrowser") ||
    ua.includes("tesla") ||
    (ua.includes("linux") &&
      ua.includes("webkit") &&
      ua.includes("x11") &&
      !ua.includes("android") &&
      !ua.includes("mobile"))
  );
}

export function isTeslaDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("teslaDebug") === "1") {
      window.localStorage.setItem(DEBUG_STORAGE_KEY, "1");
      return true;
    }
    if (params.get("teslaDebug") === "0") {
      window.localStorage.removeItem(DEBUG_STORAGE_KEY);
      return false;
    }
    return window.localStorage.getItem(DEBUG_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setTeslaDebugEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      window.localStorage.setItem(DEBUG_STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(DEBUG_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

export function createTeslaNavigationSession(
  lat: number,
  lng: number,
  primaryUrl: string
): TeslaNavigationSession {
  const userAgent =
    typeof navigator !== "undefined" ? navigator.userAgent : "unknown";

  return {
    lat,
    lng,
    userAgent,
    isTeslaBrowser: isTeslaBrowserUserAgent(userAgent),
    teslaDebugEnabled: isTeslaDebugEnabled(),
    probeResults: null,
    attempts: [],
    primaryUrl,
    outcome: "pending",
    outcomeReason: "",
  };
}

export function getActiveTeslaNavigationSession(): TeslaNavigationSession | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as Record<string, TeslaNavigationSession | undefined>)[
      SESSION_KEY
    ] ?? null
  );
}

export function setActiveTeslaNavigationSession(
  session: TeslaNavigationSession | null
): void {
  if (typeof window === "undefined") return;
  (window as unknown as Record<string, TeslaNavigationSession | undefined>)[
    SESSION_KEY
  ] = session ?? undefined;
}

export function logTeslaNav(message: string, data?: unknown): void {
  if (data !== undefined) {
    console.log(`[TESLA NAV] ${message}`, data);
    return;
  }
  console.log(`[TESLA NAV] ${message}`);
}

export function methodLabel(method: TeslaNavMethod): string {
  switch (method) {
    case "anchor_click":
      return "anchor click (user gesture)";
    case "location_href":
      return "window.location.href";
    case "window_open_self":
      return 'window.open(url, "_self")';
    case "window_open_blank":
      return "window.open(url)";
  }
}

export function variantLabel(variant: TeslaUrlVariant): string {
  switch (variant) {
    case "A":
      return "https://www.tesla.com/navigate?lat=&lon=";
    case "B":
      return "https://www.tesla.com/_ak/navigate?lat=&lon=";
    case "C":
      return "https://www.tesla.com/ak/navigate?lat=&lon=";
    case "scheme":
      return "tesla://navigate?lat=&lon=";
  }
}
