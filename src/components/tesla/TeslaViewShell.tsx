"use client";

import { useState } from "react";
import { CockpitViewShell } from "@/components/cockpit/CockpitViewShell";

interface TeslaViewShellProps {
  children: React.ReactNode;
  hideViewSwitcher?: boolean;
  showTestModeToggle?: boolean;
  showLogoutButton?: boolean;
  testModeEnabled?: boolean;
  userId?: string;
}

export function TeslaViewShell({
  children,
  hideViewSwitcher = false,
  showTestModeToggle = false,
  showLogoutButton = false,
  testModeEnabled = false,
  userId,
}: TeslaViewShellProps) {
  const [testMode, setTestMode] = useState(testModeEnabled);

  return (
    <CockpitViewShell
      subtitle="Tesla View"
      hideViewSwitcher={hideViewSwitcher}
      showTestModeToggle={showTestModeToggle}
      showLogoutButton={showLogoutButton}
      testModeEnabled={testMode}
      userId={userId}
      onTestModeChange={setTestMode}
    >
      {children}
    </CockpitViewShell>
  );
}
