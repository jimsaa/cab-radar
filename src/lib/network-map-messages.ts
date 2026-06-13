import {
  NETWORK_MAP_NO_PRESENCE_MESSAGE,
  NETWORK_MAP_UNAVAILABLE_MESSAGE,
} from "./network-map-constants";

/** Overlay copy for the admin network map canvas. */
export function networkMapOverlayMessage(
  activeDriverCount: number,
  positionCount: number,
  unavailable: boolean
): string | null {
  if (unavailable) return NETWORK_MAP_UNAVAILABLE_MESSAGE;
  if (activeDriverCount === 0) return NETWORK_MAP_NO_PRESENCE_MESSAGE;

  const missing = activeDriverCount - positionCount;
  if (missing > 0) {
    return missing === 1
      ? "1 aktiv förare saknar aktuell position"
      : `${missing} aktiva förare saknar aktuell position`;
  }

  return null;
}

/** @deprecated use networkMapOverlayMessage */
export function networkMapEmptyMessage(
  activeDriverCount: number,
  positionCount: number
): string {
  return (
    networkMapOverlayMessage(activeDriverCount, positionCount, false) ??
    NETWORK_MAP_NO_PRESENCE_MESSAGE
  );
}
