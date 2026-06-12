"use client";

import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, useMap } from "react-leaflet";
import type { AnonymizedActivityPoint } from "@/lib/driver-activity-client";

const DEFAULT_CENTER: [number, number] = [59.33, 18.07];
const DEFAULT_ZOOM = 5;

function FitActivityBounds({ points }: { points: AnonymizedActivityPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 11);
      return;
    }

    let minLat = points[0].latitude;
    let maxLat = points[0].latitude;
    let minLng = points[0].longitude;
    let maxLng = points[0].longitude;

    for (const point of points) {
      minLat = Math.min(minLat, point.latitude);
      maxLat = Math.max(maxLat, point.latitude);
      minLng = Math.min(minLng, point.longitude);
      maxLng = Math.max(maxLng, point.longitude);
    }

    map.fitBounds(
      [
        [minLat, minLng],
        [maxLat, maxLng],
      ],
      { padding: [28, 28], maxZoom: 12 }
    );
  }, [map, points]);

  return null;
}

interface ActivityMapCanvasProps {
  points: AnonymizedActivityPoint[];
}

export function ActivityMapCanvas({ points }: ActivityMapCanvasProps) {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom={false}
      className="h-[180px] w-full"
      style={{ height: "180px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FitActivityBounds points={points} />
      {points.map((point, index) => (
        <CircleMarker
          key={`${point.latitude}-${point.longitude}-${index}`}
          center={[point.latitude, point.longitude]}
          radius={5}
          pathOptions={{
            color: "#93c5fd",
            fillColor: "#60a5fa",
            fillOpacity: 0.75,
            weight: 1,
          }}
        />
      ))}
    </MapContainer>
  );
}
