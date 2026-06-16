export type PreferredView = "app" | "tesla" | "tab";

export const PREFERRED_VIEWS: PreferredView[] = ["app", "tesla", "tab"];

export const PREFERRED_VIEW_META: Record<
  PreferredView,
  { emoji: string; label: string; shortLabel: string }
> = {
  app: { emoji: "📱", label: "App View", shortLabel: "App" },
  tesla: { emoji: "🚗", label: "Tesla View", shortLabel: "Tesla" },
  tab: { emoji: "📟", label: "Tab View", shortLabel: "Tab" },
};

export function isPreferredView(value: string | null | undefined): value is PreferredView {
  return value === "app" || value === "tesla" || value === "tab";
}

export function normalizePreferredView(
  value: string | null | undefined
): PreferredView {
  return isPreferredView(value) ? value : "app";
}

export function preferredViewHomePath(view: PreferredView): string {
  switch (view) {
    case "tesla":
      return "/tesla";
    case "tab":
      return "/tab";
    default:
      return "/";
  }
}

export function preferredViewFromPathname(pathname: string): PreferredView {
  if (pathname.startsWith("/tesla")) return "tesla";
  if (pathname.startsWith("/tab")) return "tab";
  return "app";
}

export function isCockpitPath(pathname: string): boolean {
  return pathname.startsWith("/tesla") || pathname.startsWith("/tab");
}
