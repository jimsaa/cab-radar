"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, ScanSearch, User, Shield, ShieldAlert, Signal } from "lucide-react";
import { APP_NAME, APP_HEADER_TAGLINE, NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

const MARKETING_PATHS = ["/coming-soon", "/beta-login"];

function isMarketingPath(pathname: string): boolean {
  return MARKETING_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

const NAV_ITEMS = [
  { href: "/", label: "Radar", icon: Radio },
  { href: "/live", label: "LIVE", icon: Signal },
  { href: "/civilkoll", label: NAV.civilkoll, icon: ScanSearch },
  { href: "/settings", label: "Profil", icon: User },
];

function AdminHeaderLink({
  isAdmin,
  isEmergencyAdmin,
  pathname,
}: {
  isAdmin?: boolean;
  isEmergencyAdmin?: boolean;
  pathname: string;
}) {
  if (isAdmin) {
    const inAdmin = pathname.startsWith("/admin");
    const active = pathname === "/admin";
    return (
      <Link
        href="/admin"
        className={cn(
          "flex items-center gap-1 text-xs font-medium",
          inAdmin
            ? cn(
                "rounded-[14px] px-2.5 py-1.5",
                active ? "bg-[#32383F] text-white" : "text-[#B0B6BE] hover:text-white"
              )
            : cn(
                "rounded-lg px-2 py-1",
                active ? "bg-accent/20 text-accent-bright" : "text-muted hover:text-foreground"
              )
        )}
      >
        <Shield className="h-4 w-4" />
        {NAV.admin}
      </Link>
    );
  }

  if (isEmergencyAdmin) {
    const inAdmin = pathname.startsWith("/admin");
    const active = pathname.startsWith("/admin/emergency");
    return (
      <Link
        href="/admin/emergency"
        className={cn(
          "flex items-center gap-1 text-xs font-medium",
          inAdmin
            ? cn(
                "rounded-[14px] px-2.5 py-1.5",
                active
                  ? "bg-[#FF3B30]/15 text-[#FF3B30]"
                  : "text-[#B0B6BE] hover:text-white"
              )
            : cn(
                "rounded-lg px-2 py-1",
                active ? "bg-danger/20 text-danger" : "text-muted hover:text-foreground"
              )
        )}
      >
        <ShieldAlert className="h-4 w-4" />
        Nödlägen
      </Link>
    );
  }

  return null;
}

export function Header({
  isAdmin,
  isEmergencyAdmin,
  isLoggedIn,
}: {
  isAdmin?: boolean;
  isEmergencyAdmin?: boolean;
  isLoggedIn?: boolean;
}) {
  const pathname = usePathname();

  if (isMarketingPath(pathname)) {
    return null;
  }

  if (pathname.startsWith("/admin")) {
    return null;
  }

  const dashboardHome =
    isLoggedIn && (pathname === "/" || pathname === "/live");

  if (dashboardHome) {
    return (
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-end px-4 py-2">
          <AdminHeaderLink
            isAdmin={isAdmin}
            isEmergencyAdmin={isEmergencyAdmin}
            pathname={pathname}
          />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-card-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-2.5">
        <Link href="/" className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/logo.png"
            alt={APP_NAME}
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-xl"
            priority
          />
          <div className="min-w-0 text-left leading-tight">
            <span className="block text-lg font-bold tracking-tight text-foreground">
              {APP_NAME}
            </span>
            <span className="block truncate text-xs font-medium text-muted">
              {APP_HEADER_TAGLINE}
            </span>
          </div>
        </Link>
        <AdminHeaderLink
          isAdmin={isAdmin}
          isEmergencyAdmin={isEmergencyAdmin}
          pathname={pathname}
        />
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  if (isMarketingPath(pathname) || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-card-border bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors",
                active ? "text-accent-bright" : "text-muted"
              )}
            >
              <Icon className="h-6 w-6" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
