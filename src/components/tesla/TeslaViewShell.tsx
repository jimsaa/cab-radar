"use client";



import { useEffect } from "react";

import { AdminCommandCenterProvider } from "@/contexts/AdminCommandCenterContext";

import { AdminDispatchMapProvider } from "@/contexts/AdminDispatchMapContext";

import { AdminDispatchMapModal } from "@/components/admin/AdminDispatchMapModal";
import { TeslaNavigationDebugPanel } from "@/components/admin/TeslaNavigationDebugPanel";

import {

  ADMIN_COMMAND_CENTER_HEADER_HEIGHT,

  TeslaCommandCenterHeader,

} from "@/components/admin/TeslaCommandCenterHeader";



const ADMIN_THEME_COLOR = "#1E2125";

const DRIVER_THEME_COLOR = "#0a1628";



/** Tesla View shell — same admin chrome, driver snapshot and map only. */

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

    <AdminCommandCenterProvider snapshotUrl="/api/tesla/driving-snapshot">

      <AdminDispatchMapProvider>

        <div className="admin-command-center-root min-h-dvh bg-background text-foreground">

          <TeslaCommandCenterHeader

            subtitle="Tesla View"

            contextLabel="LIVE"

            contextHint="Systemet uppdateras automatiskt"

          />

          <div

            className="admin-command-center-body min-h-dvh"

            style={{ paddingTop: ADMIN_COMMAND_CENTER_HEADER_HEIGHT }}

          >

            {children}

          </div>

          <AdminDispatchMapModal />
          <TeslaNavigationDebugPanel />
        </div>

      </AdminDispatchMapProvider>

    </AdminCommandCenterProvider>

  );

}

