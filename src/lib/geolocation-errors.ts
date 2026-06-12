import type { GeoPosition } from "./geolocation";

export function isGeolocationSecureContext(): boolean {
  return typeof window !== "undefined" && window.isSecureContext;
}

/** Human-readable GPS error for drivers (Swedish). */
export function geolocationErrorMessage(err?: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    const { hostname, port, protocol } = window.location;
    if (protocol === "http:" && hostname !== "localhost" && hostname !== "127.0.0.1") {
      const portSuffix = port ? `:${port}` : "";
      return `GPS kräver HTTPS på mobilen. Öppna https://${hostname}${portSuffix} och godkänn certifikatvarningen. Tillåt sedan plats när webbläsaren frågar.`;
    }
  }

  const code =
    err && typeof err === "object" && "code" in err
      ? (err as GeolocationPositionError).code
      : undefined;

  switch (code) {
    case 1:
      return "Platsbehörighet nekad. Tillåt plats för webbläsaren i telefonens inställningar.";
    case 2:
      return "GPS-signal saknas. Kontrollera att platstjänster är på.";
    case 3:
      return "GPS tog för lång tid. Försök igen.";
    default:
      return "Kunde inte hämta GPS. Tillåt platsbehörighet och försök igen.";
  }
}

export type { GeoPosition };
