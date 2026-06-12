export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "nu";
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} tim`;
  return `${Math.floor(hrs / 24)} d`;
}

/** Swedish “time ago” for feed rows, e.g. "2 min sedan" */
export function formatRelativeTimeAgo(iso: string): string {
  const rel = formatRelativeTime(iso);
  if (rel === "nu") return "just nu";
  return `${rel} sedan`;
}

export function formatExpiry(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const mins = Math.max(0, Math.floor((d.getTime() - now.getTime()) / 60000));
  if (mins < 60) return `går ut om ${mins} min`;
  return `går ut om ${Math.floor(mins / 60)} tim`;
}
