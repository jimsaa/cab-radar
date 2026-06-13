/** SJ Ankomster Göteborg C — external shortcut only (no embedded data). */

export const SJ_ANKOMSTER_URL =
  "https://tagtider.net/goteborg-c/ankomster/";

export const SJ_ANKOMSTER_ADMIN_LABEL = "🚆 SJ Ankomster";

export const SJ_ANKOMSTER_DRIVER_LABEL = "🚆 SJ Ankomster";
export const SJ_ANKOMSTER_DRIVER_SUBTITLE = "Ankomster Göteborg C";

export function openSjAnkomster(): void {
  if (typeof window === "undefined") return;
  window.open(SJ_ANKOMSTER_URL, "_blank", "noopener,noreferrer");
}
