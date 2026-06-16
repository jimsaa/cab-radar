"use client";

import { CockpitViewShell } from "@/components/cockpit/CockpitViewShell";

export function TeslaViewShell({ children }: { children: React.ReactNode }) {
  return (
    <CockpitViewShell subtitle="Tesla View">{children}</CockpitViewShell>
  );
}
