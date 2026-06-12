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
    border: "border-[#F4C430]/70",
    glow: "shadow-[0_0_24px_rgba(244,196,48,0.18)]",
    badge: "bg-[#F4C430] text-[#1E2125]",
    pulse: "admin-pulse-taxikontroll",
    subtitle: "text-[#F4C430]",
  },
  red: {
    border: "border-[#FF3B30]/70",
    glow: "shadow-[0_0_24px_rgba(255,59,48,0.2)]",
    badge: "bg-[#FF3B30] text-white",
    pulse: "admin-pulse-emergency",
    subtitle: "text-[#FF3B30]",
  },
  blue: {
    border: "border-[#3B82F6]/70",
    glow: "shadow-[0_0_24px_rgba(59,130,246,0.18)]",
    badge: "bg-[#3B82F6] text-white",
    pulse: "admin-pulse-olycka",
    subtitle: "text-[#3B82F6]",
  },
  purple: {
    border: "border-[#A855F7]/70",
    glow: "shadow-[0_0_24px_rgba(168,85,247,0.18)]",
    badge: "bg-[#A855F7] text-white",
    pulse: "admin-pulse-laser",
    subtitle: "text-[#A855F7]",
  },
  green: {
    border: "border-[#22C55E]/70",
    glow: "shadow-[0_0_24px_rgba(34,197,94,0.18)]",
    badge: "bg-[#22C55E] text-[#1E2125]",
    pulse: "admin-pulse-success",
    subtitle: "text-[#22C55E]",
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
        "admin-stat-card relative block border p-4 transition hover:border-[#4A5159]",
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
            <p className="admin-stat-subtitle mt-0.5 text-xs text-muted">{subtitle}</p>
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
            <p key={line.message} className="text-sm text-[#B0B6BE]">
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
