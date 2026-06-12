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
  { href: "/admin/feedback", label: "Synpunkter", icon: MessageSquare },
  { href: "/admin/support", label: "Support", icon: Headphones },
  { href: "/admin/partner", label: "Samarbetspartner", icon: Handshake },
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
      return "border-[#FF3B30]/70 bg-[#FF3B30]/10 ring-2 ring-[#FF3B30]/30 text-foreground";
    case "users":
      return "border-[#F4C430]/70 bg-[#F4C430]/10 ring-2 ring-[#F4C430]/30 text-foreground";
    case "support":
      return "border-[#3B82F6]/70 bg-[#3B82F6]/10 ring-2 ring-[#3B82F6]/30 text-foreground";
    case "feedback":
      return "border-[#A855F7]/70 bg-[#A855F7]/10 ring-2 ring-[#A855F7]/30 text-foreground";
    case "partner":
      return "border-[#22C55E]/70 bg-[#22C55E]/10 ring-2 ring-[#22C55E]/30 text-foreground";
    case "alerts":
      return "border-[#F97316]/70 bg-[#F97316]/10 ring-2 ring-[#F97316]/25 text-foreground";
    case "civilkoll":
      return "border-[#8B5CF6]/70 bg-[#8B5CF6]/10 ring-2 ring-[#8B5CF6]/30 text-foreground";
  }
}

function badgeDotStyles(key: AdminBadgeKey): string {
  switch (key) {
    case "emergency":
      return "bg-[#FF3B30] text-white";
    case "users":
      return "bg-[#F4C430] text-[#1E2125]";
    case "support":
      return "bg-[#3B82F6] text-white";
    case "feedback":
      return "bg-[#A855F7] text-white";
    case "partner":
      return "bg-[#22C55E] text-[#1E2125]";
    case "alerts":
      return "bg-[#F97316] text-white";
    case "civilkoll":
      return "bg-[#8B5CF6] text-white";
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
              "relative flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-[18px] border px-1.5 py-2 text-center text-[11px] font-semibold leading-tight transition active:scale-[0.97]",
              active && !showUnread
                ? "admin-nav-active"
                : active && showUnread && badgeKey
                  ? cn(badgeStyles(badgeKey), "text-white")
                  : showUnread && badgeKey
                    ? badgeStyles(badgeKey)
                    : "admin-nav-idle"
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
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#F4C430]" />
            )}
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
