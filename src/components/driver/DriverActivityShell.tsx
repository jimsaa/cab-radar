"use client";

import { DriverActivityRecorder } from "@/components/driver/DriverActivityRecorder";
import { DriverMessageInbox } from "@/components/messages/DriverMessageInbox";

interface DriverActivityShellProps {
  enabled: boolean;
}

export function DriverActivityShell({ enabled }: DriverActivityShellProps) {
  return (
    <>
      <DriverActivityRecorder enabled={enabled} />
      {enabled && <DriverMessageInbox variant="mobile" />}
    </>
  );
}
