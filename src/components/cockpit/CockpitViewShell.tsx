"use client";

import { useEffect } from "react";
import { AdminCommandCenterProvider } from "@/contexts/AdminCommandCenterContext";
import { AdminDispatchMapProvider } from "@/contexts/AdminDispatchMapContext";
import { AdminDispatchMapModal } from "@/components/admin/AdminDispatchMapModal";
import { TeslaNavigationDebugPanel } from "@/components/admin/TeslaNavigationDebugPanel";
import { AdminMessageBanner } from "@/components/messages/AdminMessageBanner";
import {
  ADMIN_COMMAND_CENTER_HEADER_HEIGHT,
  TeslaCommandCenterHeader,
} from "@/components/admin/TeslaCommandCenterHeader";

const ADMIN_THEME_COLOR = "#1E2125";
const DRIVER_THEME_COLOR = "#0a1628";

interface CockpitViewShellProps {
  subtitle: string;
  snapshotUrl?: string;
  hideViewSwitcher?: boolean;
  showTestModeToggle?: boolean;
  showLogoutButton?: boolean;
  testModeEnabled?: boolean;
  userId?: string;
  onTestModeChange?: (enabled: boolean) => void;
  children: React.ReactNode;
}

/** Shared full-screen cockpit chrome for Tesla + Tab views. */
export function CockpitViewShell({
  subtitle,
  snapshotUrl = "/api/tesla/driving-snapshot",
  hideViewSwitcher = false,
  showTestModeToggle = false,
  showLogoutButton = false,
  testModeEnabled = false,
  userId,
  onTestModeChange,
  children,
}: CockpitViewShellProps) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("admin-command-center");
    document.body.classList.add("tesla-command-center-active");

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const previousTheme =
      themeMeta?.getAttribute("content") ?? DRIVER_THEME_COLOR;
    themeMeta?.setAttribute("content", ADMIN_THEME_COLOR);

    return () => {
      root.classList.remove("admin-command-center");
      document.body.classList.remove("tesla-command-center-active");
      themeMeta?.setAttribute("content", previousTheme);
    };
  }, []);

  return (
    <AdminCommandCenterProvider snapshotUrl={snapshotUrl}>
      <AdminDispatchMapProvider>
        <div className="admin-command-center-root min-h-dvh bg-background text-foreground view-transition-shell">
          <TeslaCommandCenterHeader
            subtitle={subtitle}
            contextLabel="LIVE"
            contextHint="Systemet uppdateras automatiskt"
            hideViewSwitcher={hideViewSwitcher}
            showTestModeToggle={showTestModeToggle}
            showLogoutButton={showLogoutButton}
            testModeEnabled={testModeEnabled}
            userId={userId}
            onTestModeChange={onTestModeChange}
          />
          <div
            className="admin-command-center-body min-h-dvh"
            style={{ paddingTop: ADMIN_COMMAND_CENTER_HEADER_HEIGHT }}
          >
            <AdminMessageBanner variant="tesla" />
            {children}
          </div>
          <AdminDispatchMapModal />
          <TeslaNavigationDebugPanel />
        </div>
      </AdminDispatchMapProvider>
    </AdminCommandCenterProvider>
  );
}
