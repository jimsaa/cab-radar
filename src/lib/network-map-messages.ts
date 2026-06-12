/** Empty-state copy when the admin network map has no dots to render. */
export function networkMapEmptyMessage(
  activeDriverCount: number,
  positionCount: number
): string {
  const missing = activeDriverCount - positionCount;
  if (activeDriverCount > 0 && missing > 0) {
    return missing === 1
      ? "1 aktiv förare saknar aktuell position"
      : `${missing} aktiva förare saknar aktuell position`;
  }
  return "Inga aktiva förare att visa";
}
