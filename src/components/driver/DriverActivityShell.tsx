"use client";

import { DriverActivityRecorder } from "@/components/driver/DriverActivityRecorder";
import { AdminMessageBanner } from "@/components/messages/AdminMessageBanner";

interface DriverActivityShellProps {
  enabled: boolean;
}

export function DriverActivityShell({ enabled }: DriverActivityShellProps) {
  return (
    <>
      <DriverActivityRecorder enabled={enabled} />
      {enabled && <AdminMessageBanner variant="mobile" />}
    </>
  );
}
