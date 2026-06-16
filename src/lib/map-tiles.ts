/** CabRadar map tile themes — default is light for in-car readability. */

export type MapTheme = "light" | "dark";

export const DEFAULT_MAP_THEME: MapTheme = "light";

export interface MapTileConfig {
  url: string;
  attribution: string;
  /** Leaflet container background while tiles load */
  background: string;
}

export const MAP_TILE_CONFIG: Record<MapTheme, MapTileConfig> = {
  light: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    background: "#e8ecef",
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    background: "#0a1628",
  },
};

export function getMapTileConfig(theme: MapTheme = DEFAULT_MAP_THEME): MapTileConfig {
  return MAP_TILE_CONFIG[theme];
}
