"use client";

import { DriverActivityRecorder } from "@/components/driver/DriverActivityRecorder";

interface DriverActivityShellProps {
  enabled: boolean;
}

export function DriverActivityShell({ enabled }: DriverActivityShellProps) {
  return <DriverActivityRecorder enabled={enabled} />;
}
