"use client";

import { useState } from "react";
import { CockpitViewShell } from "@/components/cockpit/CockpitViewShell";

interface TeslaViewShellProps {
  children: React.ReactNode;
  isTeslaBeta?: boolean;
  nickname?: string | null;
  testModeEnabled?: boolean;
  userId?: string;
}

export function TeslaViewShell({
  children,
  isTeslaBeta = false,
  nickname,
  testModeEnabled = false,
  userId,
}: TeslaViewShellProps) {
  const [testMode, setTestMode] = useState(testModeEnabled);

  return (
    <CockpitViewShell
      subtitle={isTeslaBeta ? "Tesla Beta" : "Tesla View"}
      isTeslaBeta={isTeslaBeta}
      nickname={nickname}
      testModeEnabled={testMode}
      userId={userId}
      onTestModeChange={setTestMode}
    >
      {children}
    </CockpitViewShell>
  );
}
