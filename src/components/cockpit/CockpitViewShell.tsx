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
import {
  TEST_MODE_BANNER_SUBTITLE,
  TEST_MODE_BANNER_TITLE,
} from "@/lib/test-mode";

const ADMIN_THEME_COLOR = "#1E2125";
const DRIVER_THEME_COLOR = "#0a1628";

interface CockpitViewShellProps {
  subtitle: string;
  snapshotUrl?: string;
  isTeslaBeta?: boolean;
  nickname?: string | null;
  testModeEnabled?: boolean;
  userId?: string;
  onTestModeChange?: (enabled: boolean) => void;
  children: React.ReactNode;
}

/** Shared full-screen cockpit chrome for Tesla + Tab views. */
export function CockpitViewShell({
  subtitle,
  snapshotUrl = "/api/tesla/driving-snapshot",
  isTeslaBeta = false,
  nickname,
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
            isTeslaBeta={isTeslaBeta}
            nickname={nickname}
            testModeEnabled={testModeEnabled}
            userId={userId}
            onTestModeChange={onTestModeChange}
          />
          {isTeslaBeta && testModeEnabled && (
            <div
              role="status"
              className="fixed left-0 right-0 z-[105] border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-center sm:hidden"
              style={{ top: ADMIN_COMMAND_CENTER_HEADER_HEIGHT }}
            >
              <p className="text-xs font-bold text-amber-200">
                {TEST_MODE_BANNER_TITLE}
              </p>
              <p className="text-[10px] text-amber-200/90">
                {TEST_MODE_BANNER_SUBTITLE}
              </p>
            </div>
          )}
          <div
            className="admin-command-center-body min-h-dvh"
            style={{
              paddingTop:
                ADMIN_COMMAND_CENTER_HEADER_HEIGHT +
                (isTeslaBeta && testModeEnabled ? 52 : 0),
            }}
          >
            <AdminMessageBanner variant="tesla" />
            {children}
          </div>
          <AdminDispatchMapModal />
          {!isTeslaBeta && <TeslaNavigationDebugPanel />}
        </div>
      </AdminDispatchMapProvider>
    </AdminCommandCenterProvider>
  );
}
