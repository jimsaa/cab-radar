"use client";

import { DriverActivityRecorder } from "@/components/driver/DriverActivityRecorder";
import { AdminMessageBanner } from "@/components/messages/AdminMessageBanner";

interface DriverActivityShellProps {
  /** GPS / heartbeat recording — drivers only, not admins. */
  activityEnabled: boolean;
  /** Admin message banner — any logged-in user with an unread message. */
  messageBannerEnabled: boolean;
}

export function DriverActivityShell({
  activityEnabled,
  messageBannerEnabled,
}: DriverActivityShellProps) {
  return (
    <>
      <DriverActivityRecorder enabled={activityEnabled} />
      {messageBannerEnabled && <AdminMessageBanner variant="mobile" />}
    </>
  );
}
