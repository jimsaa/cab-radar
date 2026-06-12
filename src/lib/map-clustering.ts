import { distanceMeters } from "@/lib/geo";
import type { AnonymizedActivityPoint } from "@/lib/driver-activity";

export interface MapCluster {
  latitude: number;
  longitude: number;
  count: number;
}

/** Merge nearby driver dots into numbered clusters for the admin network map. */
export function clusterMapPoints(
  points: AnonymizedActivityPoint[],
  radiusM = 750
): MapCluster[] {
  const clusters: MapCluster[] = [];

  for (const point of points) {
    let merged = false;

    for (const cluster of clusters) {
      if (
        distanceMeters(
          point.latitude,
          point.longitude,
          cluster.latitude,
          cluster.longitude
        ) <= radiusM
      ) {
        const nextCount = cluster.count + 1;
        cluster.latitude =
          (cluster.latitude * cluster.count + point.latitude) / nextCount;
        cluster.longitude =
          (cluster.longitude * cluster.count + point.longitude) / nextCount;
        cluster.count = nextCount;
        merged = true;
        break;
      }
    }

    if (!merged) {
      clusters.push({
        latitude: point.latitude,
        longitude: point.longitude,
        count: 1,
      });
    }
  }

  return clusters;
}
