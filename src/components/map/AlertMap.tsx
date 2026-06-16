"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import {
  alertTypeDisplayLabel,
  alertTypeLabel,
  googleMapsLink,
} from "@/lib/constants";
import {
  isTaxiEmergencyAlert,
  PUBLIC_EMERGENCY_LABEL,
  publicEmergencyLocationLabel,
  publicEmergencyMapsUrl,
} from "@/lib/emergency-privacy";
import type { DriverAlert } from "@/lib/types/database";

const defaultIcon = L.divIcon({
  className: "cab-marker",
  html: `<div style="background:#1e88e5;width:28px;height:28px;border-radius:50%;border:3px solid #0a1628;display:flex;align-items:center;justify-content:center;font-size:14px;">🚕</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function FitBounds({ alerts }: { alerts: DriverAlert[] }) {
  const map = useMap();

  useEffect(() => {
    const withCoords = alerts.filter(
      (a) => a.latitude != null && a.longitude != null
    );
    if (withCoords.length === 0) return;

    if (withCoords.length === 1) {
      map.setView([withCoords[0].latitude!, withCoords[0].longitude!], 14);
      return;
    }

    const bounds = L.latLngBounds(
      withCoords.map((a) => [a.latitude!, a.longitude!] as [number, number])
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [alerts, map]);

  return null;
}

interface AlertMapProps {
  alerts: DriverAlert[];
  height?: string;
}

export function AlertMap({ alerts, height = "240px" }: AlertMapProps) {
  const withCoords = alerts.filter(
    (a) => a.latitude != null && a.longitude != null
  );

  const center: [number, number] =
    withCoords.length > 0
      ? [withCoords[0].latitude!, withCoords[0].longitude!]
      : [59.3293, 18.0686];

  return (
    <div
      className="overflow-hidden rounded-2xl border border-card-border"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ height: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds alerts={withCoords} />
        {withCoords.map((alert) => {
          const lat = alert.emergency_last_latitude ?? alert.latitude!;
          const lng = alert.emergency_last_longitude ?? alert.longitude!;
          const mapsUrl = isTaxiEmergencyAlert(alert)
            ? publicEmergencyMapsUrl(alert)
            : googleMapsLink(alert.latitude!, alert.longitude!);

          return (
          <Marker
            key={alert.id}
            position={[lat, lng]}
            icon={defaultIcon}
          >
            <Popup>
              <div className="text-sm">
                {isTaxiEmergencyAlert(alert) ? (
                  <>
                    <p className="font-semibold">🆘 {PUBLIC_EMERGENCY_LABEL}</p>
                    {publicEmergencyLocationLabel(alert) && (
                      <p className="mt-1">{publicEmergencyLocationLabel(alert)}</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-semibold">
                      {alertTypeDisplayLabel(alert.type)}
                    </p>
                    <p className="mt-1">{alert.title}</p>
                  </>
                )}
                {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-accent"
                >
                  📍 Öppna i karta →
                </a>
                )}
              </div>
            </Popup>
          </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
