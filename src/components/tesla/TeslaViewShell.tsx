"use client";

import { useEffect } from "react";
import {
  ADMIN_COMMAND_CENTER_HEADER_HEIGHT,
  TeslaCommandCenterHeader,
} from "@/components/admin/TeslaCommandCenterHeader";

const ADMIN_THEME_COLOR = "#1E2125";
const DRIVER_THEME_COLOR = "#0a1628";

/** Driver Tesla View shell — dark theme, no admin tools. */
export function TeslaViewShell({ children }: { children: React.ReactNode }) {
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
    <div className="admin-command-center-root min-h-dvh bg-background text-foreground">
      <TeslaCommandCenterHeader
        subtitle="Driver-focused command center"
        contextLabel="Tesla View"
        contextHint="Förare — kommer snart"
      />
      <div
        className="admin-command-center-body min-h-dvh"
        style={{ paddingTop: ADMIN_COMMAND_CENTER_HEADER_HEIGHT }}
      >
        {children}
      </div>
    </div>
  );
}
