export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export {
  formatRelativeSwedish as formatRelativeTime,
  formatRelativeSwedish as formatRelativeTimeAgo,
  formatExpirySwedish as formatExpiry,
} from "./datetime";
