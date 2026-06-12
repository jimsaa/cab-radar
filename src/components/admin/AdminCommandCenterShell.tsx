"use client";

import { useEffect } from "react";
import { AdminCommandCenterProvider } from "@/contexts/AdminCommandCenterContext";

const ADMIN_THEME_COLOR = "#1E2125";
const DRIVER_THEME_COLOR = "#0a1628";

/** Applies Tesla-inspired graphite theme while Admin Command Center is active. */
export function AdminCommandCenterShell({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("admin-command-center");

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const previousTheme = themeMeta?.getAttribute("content") ?? DRIVER_THEME_COLOR;
    themeMeta?.setAttribute("content", ADMIN_THEME_COLOR);

    return () => {
      root.classList.remove("admin-command-center");
      themeMeta?.setAttribute("content", previousTheme);
    };
  }, []);

  return (
    <AdminCommandCenterProvider>
      <div className="admin-command-center-root min-h-full bg-background text-foreground">
        {children}
      </div>
    </AdminCommandCenterProvider>
  );
}
