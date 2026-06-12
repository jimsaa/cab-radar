"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { CircleMarker, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import type { AnonymizedActivityPoint } from "@/lib/driver-activity-client";
import { clusterMapPoints, type MapCluster } from "@/lib/map-clustering";

const DEFAULT_CENTER: [number, number] = [59.33, 18.07];
const DEFAULT_ZOOM = 5;

function FitNetworkBounds({ clusters }: { clusters: MapCluster[] }) {
  const map = useMap();

  useEffect(() => {
    if (clusters.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    if (clusters.length === 1) {
      map.setView([clusters[0].latitude, clusters[0].longitude], 11);
      return;
    }

    let minLat = clusters[0].latitude;
    let maxLat = clusters[0].latitude;
    let minLng = clusters[0].longitude;
    let maxLng = clusters[0].longitude;

    for (const cluster of clusters) {
      minLat = Math.min(minLat, cluster.latitude);
      maxLat = Math.max(maxLat, cluster.latitude);
      minLng = Math.min(minLng, cluster.longitude);
      maxLng = Math.max(maxLng, cluster.longitude);
    }

    map.fitBounds(
      [
        [minLat, minLng],
        [maxLat, maxLng],
      ],
      { padding: [28, 28], maxZoom: 12 }
    );
  }, [map, clusters]);

  return null;
}

function clusterMarkerIcon(count: number) {
  const size = count >= 10 ? 34 : count >= 5 ? 30 : 26;
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:rgba(59,130,246,0.92);border:2px solid rgba(147,197,253,0.95);color:#fff;font-size:12px;font-weight:700;box-shadow:0 0 12px rgba(59,130,246,0.45);">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface NetworkMapCanvasProps {
  points: AnonymizedActivityPoint[];
  height?: number;
  interactive?: boolean;
}

export function NetworkMapCanvas({
  points,
  height = 180,
  interactive = true,
}: NetworkMapCanvasProps) {
  const clusters = useMemo(() => clusterMapPoints(points), [points]);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      scrollWheelZoom={interactive}
      dragging={interactive}
      zoomControl={interactive}
      className="w-full"
      style={{ height }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FitNetworkBounds clusters={clusters} />
      {clusters.map((cluster, index) =>
        cluster.count > 1 ? (
          <Marker
            key={`cluster-${cluster.latitude}-${cluster.longitude}-${index}`}
            position={[cluster.latitude, cluster.longitude]}
            icon={clusterMarkerIcon(cluster.count)}
            interactive={false}
          />
        ) : (
          <CircleMarker
            key={`dot-${cluster.latitude}-${cluster.longitude}-${index}`}
            center={[cluster.latitude, cluster.longitude]}
            radius={5}
            pathOptions={{
              color: "#93c5fd",
              fillColor: "#3B82F6",
              fillOpacity: 0.85,
              weight: 1,
            }}
          />
        )
      )}
    </MapContainer>
  );
}

/** @deprecated Use NetworkMapCanvas */
export function ActivityMapCanvas({
  points,
}: {
  points: AnonymizedActivityPoint[];
}) {
  return <NetworkMapCanvas points={points} />;
}
