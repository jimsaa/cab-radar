"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  recordDriverActivityIfDue,
  recordDriverHeartbeatClient,
} from "@/lib/driver-activity-client";
interface DriverActivityRecorderProps {
  enabled: boolean;
}

/**
 * Records driver activity on natural app resume — never polls GPS in the background.
 */
export function DriverActivityRecorder({ enabled }: DriverActivityRecorderProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled) return;

    function onResume() {
      if (document.visibilityState === "visible") {
        void recordDriverActivityIfDue("app_resume");
      }
    }

    void recordDriverActivityIfDue("app_open");

    document.addEventListener("visibilitychange", onResume);
    return () => document.removeEventListener("visibilitychange", onResume);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    void recordDriverHeartbeatClient("page_change");
  }, [enabled, pathname]);

  return null;
}
