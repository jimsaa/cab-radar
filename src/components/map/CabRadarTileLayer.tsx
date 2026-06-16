"use client";

import { TileLayer } from "react-leaflet";
import {
  DEFAULT_MAP_THEME,
  getMapTileConfig,
  type MapTheme,
} from "@/lib/map-tiles";

interface CabRadarTileLayerProps {
  /** Future user setting — defaults to light for daylight/Tesla readability. */
  theme?: MapTheme;
}

export function CabRadarTileLayer({
  theme = DEFAULT_MAP_THEME,
}: CabRadarTileLayerProps) {
  const config = getMapTileConfig(theme);

  return <TileLayer attribution={config.attribution} url={config.url} />;
}
