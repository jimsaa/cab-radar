"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { isMissingSchemaError } from "@/lib/db-errors";
import { enablePushNotifications, isPushSupported } from "@/lib/push";

const promptedKey = (userId: string) => `cabrader_push_prompted_${userId}`;

interface PushAutoEnableProps {
  userId: string;
  isVerified: boolean;
  pushEnabled: boolean;
  pushPrompted: boolean;
}

/** Invisible: one-time OS permission prompt for verified drivers. */
export function PushAutoEnable({
  userId,
  isVerified,
  pushEnabled,
  pushPrompted,
}: PushAutoEnableProps) {
  const started = useRef(false);

  useEffect(() => {
    const alreadyPrompted =
      pushPrompted ||
      (typeof window !== "undefined" &&
        localStorage.getItem(promptedKey(userId)) === "1");

    if (!userId || !isVerified || alreadyPrompted || !pushEnabled) return;
    if (!isPushSupported()) return;
    if (started.current) return;
    started.current = true;

    async function run() {
      const result = await enablePushNotifications();
      const enabled = result.ok;

      localStorage.setItem(promptedKey(userId), "1");

      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          push_prompted: true,
          push_enabled: enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error && !isMissingSchemaError(error)) {
        console.error("[PUSH] Could not save push settings:", error);
      }
    }

    void run();
  }, [userId, isVerified, pushEnabled, pushPrompted]);

  return null;
}
