"use client";

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { Marker, MapContainer, Popup, useMap } from "react-leaflet";
import { CabRadarTileLayer } from "@/components/map/CabRadarTileLayer";
import type { AnonymizedActivityPoint } from "@/lib/driver-activity-client";
import {
  dispatchReportMarkerHtml,
  dispatchReportPopupHtml,
  type DispatchMapReport,
} from "@/lib/admin-dispatch-map";
import { clusterMapPoints, type MapCluster } from "@/lib/map-clustering";
import {
  NETWORK_MAP_DEFAULT_CENTER,
  NETWORK_MAP_DEFAULT_ZOOM,
} from "@/lib/network-map-constants";

function FitDispatchBounds({
  clusters,
  reports,
  focusReportId,
  fitToken,
}: {
  clusters: MapCluster[];
  reports: DispatchMapReport[];
  focusReportId: string | null;
  fitToken: number;
}) {
  const map = useMap();
  const lastAutoFitTokenRef = useRef(-1);

  useEffect(() => {
    if (focusReportId) {
      const focused = reports.find((report) => report.id === focusReportId);
      if (focused) {
        map.flyTo([focused.latitude, focused.longitude], 15, {
          duration: 0.7,
        });
      }
      return;
    }

    if (lastAutoFitTokenRef.current === fitToken) return;
    lastAutoFitTokenRef.current = fitToken;

    const points: [number, number][] = [
      ...clusters.map(
        (cluster) => [cluster.latitude, cluster.longitude] as [number, number]
      ),
      ...reports.map(
        (report) => [report.latitude, report.longitude] as [number, number]
      ),
    ];

    if (points.length === 0) {
      map.setView(NETWORK_MAP_DEFAULT_CENTER, NETWORK_MAP_DEFAULT_ZOOM);
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }

    map.fitBounds(L.latLngBounds(points), {
      padding: [48, 48],
      maxZoom: 13,
    });
  }, [clusters, reports, focusReportId, fitToken, map]);

  return null;
}

function clusterMarkerIcon(count: number) {
  const size = count >= 10 ? 38 : count >= 5 ? 34 : 30;
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:rgba(59,130,246,0.92);border:2px solid rgba(147,197,253,0.95);color:#fff;font-size:13px;font-weight:700;box-shadow:0 0 12px rgba(59,130,246,0.45);">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function driverDotIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:9999px;background:#3B82F6;border:2px solid #93C5FD;box-shadow:0 0 8px rgba(59,130,246,0.5);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

function ReportMapMarker({
  report,
  focused,
}: {
  report: DispatchMapReport;
  focused: boolean;
}) {
  const markerRef = useRef<L.Marker>(null);
  const size = report.isEmergency ? 40 : focused ? 38 : 34;

  const icon = useMemo(
    () =>
      L.divIcon({
        className: "cab-marker",
        html: dispatchReportMarkerHtml(report, focused),
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      }),
    [report, focused, size]
  );

  useEffect(() => {
    if (!focused) return;
    const marker = markerRef.current;
    if (!marker) return;
    window.setTimeout(() => marker.openPopup(), 400);
  }, [focused]);

  return (
    <Marker
      ref={markerRef}
      position={[report.latitude, report.longitude]}
      icon={icon}
      zIndexOffset={report.isEmergency ? 1000 : focused ? 900 : 500}
    >
      <Popup className="admin-dispatch-leaflet-popup" minWidth={240}>
        <div
          dangerouslySetInnerHTML={{
            __html: dispatchReportPopupHtml(report),
          }}
        />
      </Popup>
    </Marker>
  );
}

interface DispatchMapCanvasProps {
  driverPoints: AnonymizedActivityPoint[];
  reports: DispatchMapReport[];
  focusReportId?: string | null;
  fitToken?: number;
  height: number | string;
  className?: string;
}

export function DispatchMapCanvas({
  driverPoints,
  reports,
  focusReportId = null,
  fitToken = 0,
  height,
  className,
}: DispatchMapCanvasProps) {
  const clusters = useMemo(
    () => clusterMapPoints(driverPoints),
    [driverPoints]
  );

  return (
    <div className={className}>
      <MapContainer
        center={NETWORK_MAP_DEFAULT_CENTER}
        zoom={NETWORK_MAP_DEFAULT_ZOOM}
        scrollWheelZoom
        dragging
        zoomControl
        className="admin-dispatch-map h-full w-full"
        style={{ height }}
      >
        <CabRadarTileLayer />
        <FitDispatchBounds
          clusters={clusters}
          reports={reports}
          focusReportId={focusReportId}
          fitToken={fitToken}
        />

        {clusters.map((cluster, index) =>
          cluster.count > 1 ? (
            <Marker
              key={`cluster-${cluster.latitude}-${cluster.longitude}-${index}`}
              position={[cluster.latitude, cluster.longitude]}
              icon={clusterMarkerIcon(cluster.count)}
              zIndexOffset={100}
            >
              <Popup>
                <div className="admin-dispatch-popup">
                  <p className="admin-dispatch-popup-title">Aktiva förare</p>
                  <p className="admin-dispatch-popup-location">
                    {cluster.count} förare i området
                  </p>
                </div>
              </Popup>
            </Marker>
          ) : (
            <Marker
              key={`driver-${cluster.latitude}-${cluster.longitude}-${index}`}
              position={[cluster.latitude, cluster.longitude]}
              icon={driverDotIcon()}
              zIndexOffset={50}
            >
              <Popup>
                <div className="admin-dispatch-popup">
                  <p className="admin-dispatch-popup-title">Aktiv förare</p>
                  <p className="admin-dispatch-popup-location">
                    Ungefärlig närvaro
                  </p>
                </div>
              </Popup>
            </Marker>
          )
        )}

        {reports.map((report) => (
          <ReportMapMarker
            key={report.id}
            report={report}
            focused={focusReportId === report.id}
          />
        ))}
      </MapContainer>
    </div>
  );
}
