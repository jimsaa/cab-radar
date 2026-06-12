"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Handshake,
  Headphones,
  Image,
  Mail,
  MessageSquare,
  ScanSearch,
  ShieldAlert,
  Tag,
  Users,
  LayoutDashboard,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAdminBadges, ADMIN_HREF_BADGE } from "@/hooks/useAdminBadges";
import type { AdminBadgeKey } from "@/lib/admin-notifications";

const FULL_LINKS = [
  { href: "/admin", label: "Översikt", icon: LayoutDashboard },
  { href: "/admin/emergency", label: "Nödlägen", icon: ShieldAlert },
  { href: "/admin/civilkoll", label: "Civilkoll", icon: ScanSearch },
  { href: "/admin/alerts", label: "Varningar", icon: AlertTriangle },
  { href: "/admin/deals", label: "Erbjudanden", icon: Tag },
  { href: "/admin/help", label: "Hjälp", icon: BookOpen },
  { href: "/admin/banners", label: "Banners", icon: Image },
  { href: "/admin/users", label: "Förare", icon: Users },
  { href: "/admin/waitlist", label: "Intresse", icon: Mail },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/admin/support", label: "Support", icon: Headphones },
  { href: "/admin/partner", label: "Partner", icon: Handshake },
];

const EMERGENCY_ONLY_LINKS = [
  { href: "/admin/emergency", label: "Nödlägen", icon: ShieldAlert },
];

const OFFERS_ONLY_LINKS = [
  { href: "/admin/deals", label: "Erbjudanden", icon: Tag },
];

function badgeStyles(key: AdminBadgeKey): string {
  switch (key) {
    case "emergency":
      return "border-red-500/70 bg-red-500/10 ring-2 ring-red-500/30 text-foreground";
    case "users":
      return "border-amber-500/70 bg-amber-500/10 ring-2 ring-amber-500/30 text-foreground";
    case "support":
      return "border-sky-500/70 bg-sky-500/10 ring-2 ring-sky-500/30 text-foreground";
    case "feedback":
      return "border-purple-500/70 bg-purple-500/10 ring-2 ring-purple-500/30 text-foreground";
    case "partner":
      return "border-emerald-500/70 bg-emerald-500/10 ring-2 ring-emerald-500/30 text-foreground";
    case "alerts":
      return "border-amber-500/60 bg-amber-500/10 ring-2 ring-amber-500/25 text-foreground";
    case "civilkoll":
      return "border-yellow-500/70 bg-yellow-500/10 ring-2 ring-yellow-500/30 text-foreground";
  }
}

function badgeDotStyles(key: AdminBadgeKey): string {
  switch (key) {
    case "emergency":
      return "bg-red-500 text-white";
    case "users":
      return "bg-amber-500 text-white";
    case "support":
      return "bg-sky-500 text-white";
    case "feedback":
      return "bg-purple-500 text-white";
    case "partner":
      return "bg-emerald-500 text-white";
    case "alerts":
      return "bg-amber-500 text-white";
    case "civilkoll":
      return "bg-yellow-500 text-white";
  }
}

export function AdminNav({ mode = "full" }: { mode?: "full" | "emergency" | "offers" }) {
  const pathname = usePathname();
  const { isUnread, isOverviewUnread, unreadCount } = useAdminBadges();
  const links =
    mode === "emergency"
      ? EMERGENCY_ONLY_LINKS
      : mode === "offers"
        ? OFFERS_ONLY_LINKS
        : FULL_LINKS;

  return (
    <nav
      className={cn(
        "mb-6 grid gap-2",
        mode === "emergency" ? "grid-cols-1" : mode === "offers" ? "grid-cols-1" : "grid-cols-3 sm:grid-cols-4"
      )}
    >
      {links.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(href);

        const badgeKey = ADMIN_HREF_BADGE[href];
        const overviewUnread = href === "/admin" && isOverviewUnread();
        const sectionUnread = badgeKey ? isUnread(badgeKey) : false;
        const showUnread = overviewUnread || sectionUnread;
        const newCount = badgeKey ? unreadCount(badgeKey) : 0;

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "relative flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-center text-[11px] font-semibold leading-tight transition active:scale-[0.97]",
              active && !showUnread
                ? "border-accent/50 bg-accent text-white shadow-lg shadow-accent/20"
                : active && showUnread && badgeKey
                  ? cn(badgeStyles(badgeKey), "text-white")
                  : showUnread && badgeKey
                    ? badgeStyles(badgeKey)
                    : "border-card-border bg-card text-muted hover:border-accent/30 hover:text-foreground"
            )}
          >
            {showUnread && newCount > 0 && badgeKey && (
              <span
                className={cn(
                  "absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                  badgeDotStyles(badgeKey)
                )}
              >
                {newCount > 9 ? "9+" : newCount}
              </span>
            )}
            {showUnread && href === "/admin" && isOverviewUnread() && (
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-500" />
            )}
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
