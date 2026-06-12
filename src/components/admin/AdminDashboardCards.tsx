import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminAttentionVariant =
  | "orange"
  | "red"
  | "blue"
  | "purple"
  | "green";

const ATTENTION_STYLES: Record<
  AdminAttentionVariant,
  {
    border: string;
    glow: string;
    badge: string;
    pulse: string;
    subtitle: string;
  }
> = {
  orange: {
    border: "border-amber-500/70",
    glow: "shadow-[0_0_24px_rgba(245,158,11,0.22)]",
    badge: "bg-amber-500 text-white",
    pulse: "admin-pulse-orange",
    subtitle: "text-amber-200/85",
  },
  red: {
    border: "border-red-500/70",
    glow: "shadow-[0_0_24px_rgba(248,113,113,0.22)]",
    badge: "bg-red-500 text-white",
    pulse: "admin-pulse-red",
    subtitle: "text-red-200/85",
  },
  blue: {
    border: "border-sky-500/70",
    glow: "shadow-[0_0_24px_rgba(56,189,248,0.2)]",
    badge: "bg-sky-500 text-white",
    pulse: "admin-pulse-blue",
    subtitle: "text-sky-200/85",
  },
  purple: {
    border: "border-purple-500/70",
    glow: "shadow-[0_0_24px_rgba(168,85,247,0.2)]",
    badge: "bg-purple-500 text-white",
    pulse: "admin-pulse-purple",
    subtitle: "text-purple-200/85",
  },
  green: {
    border: "border-emerald-500/70",
    glow: "shadow-[0_0_24px_rgba(52,211,153,0.2)]",
    badge: "bg-emerald-500 text-white",
    pulse: "admin-pulse-green",
    subtitle: "text-emerald-200/85",
  },
};

interface AdminStatCardProps {
  href: string;
  icon: LucideIcon;
  label: string;
  value?: string | number;
  subtitle?: string;
  attention?: AdminAttentionVariant;
  badgeCount?: number;
}

export function AdminStatCard({
  href,
  icon: Icon,
  label,
  value,
  subtitle,
  attention,
  badgeCount,
}: AdminStatCardProps) {
  const needsAttention = Boolean(attention && badgeCount && badgeCount > 0);
  const styles = attention ? ATTENTION_STYLES[attention] : null;

  return (
    <Link
      href={href}
      className={cn(
        "relative block rounded-2xl border bg-card p-4 transition hover:border-foreground/20",
        needsAttention && styles
          ? cn(styles.border, styles.glow, styles.pulse)
          : "border-card-border"
      )}
    >
      {needsAttention && badgeCount !== undefined && (
        <span
          className={cn(
            "absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold",
            styles!.badge
          )}
        >
          {badgeCount > 9 ? "9+" : badgeCount}
        </span>
      )}

      <Icon
        className={cn(
          "h-6 w-6",
          needsAttention ? "text-foreground" : "text-foreground"
        )}
      />

      <p className="mt-3 text-base font-semibold text-foreground">{label}</p>

      {needsAttention && subtitle ? (
        <p className={cn("mt-1 text-sm leading-snug", styles!.subtitle)}>
          {subtitle}
        </p>
      ) : value !== undefined ? (
        <>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
          )}
        </>
      ) : null}
    </Link>
  );
}

interface AdminDashboardHeaderProps {
  firstName: string;
  actionLines: { message: string }[];
}

export function AdminDashboardHeader({
  firstName,
  actionLines,
}: AdminDashboardHeaderProps) {
  return (
    <header className="mb-5 py-2">
      <h1 className="text-xl font-bold text-foreground">Hej {firstName} 👋</h1>

      {actionLines.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {actionLines.map((line) => (
            <p key={line.message} className="text-sm text-muted">
              🔔 {line.message}
            </p>
          ))}
        </div>
      )}

      {actionLines.length === 0 && (
        <p className="mt-2 text-sm text-muted">Allt under kontroll.</p>
      )}
    </header>
  );
}
