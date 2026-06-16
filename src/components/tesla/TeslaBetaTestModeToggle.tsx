"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DISABLE_TEST_MODE_CONFIRM } from "@/lib/test-mode";
import { recordDriverActivityFromDevice } from "@/lib/driver-activity-client";
import { cn } from "@/lib/utils";

interface TeslaBetaTestModeToggleProps {
  userId: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
}

/** Compact TEST MODE ON/OFF toggle for Tesla Beta header. */
export function TeslaBetaTestModeToggle({
  userId,
  enabled,
  onChange,
  className,
}: TeslaBetaTestModeToggleProps) {
  const [saving, setSaving] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);

  async function persistTestMode(next: boolean) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        test_mode_enabled: next,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (!error) {
      onChange(next);
      setConfirmOff(false);
      void recordDriverActivityFromDevice("test_mode");
    }
    setSaving(false);
  }

  function handleToggle() {
    if (enabled) {
      setConfirmOff(true);
      return;
    }
    void persistTestMode(true);
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        disabled={saving}
        onClick={handleToggle}
        className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
          enabled
            ? "border-amber-500/50 bg-amber-500/15 text-amber-200"
            : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
        )}
        aria-pressed={enabled}
      >
        <span>TEST MODE</span>
        <span className="rounded-md bg-black/30 px-1.5 py-0.5 font-mono text-[10px]">
          {enabled ? "ON" : "OFF"}
        </span>
      </button>

      {confirmOff && (
        <div className="absolute right-0 top-full z-[120] mt-2 w-72 rounded-xl border border-[#3A4048] bg-[#1B1E22] p-4 shadow-xl">
          <p className="text-sm leading-relaxed text-[#B0B6BE]">
            {DISABLE_TEST_MODE_CONFIRM}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void persistTestMode(false)}
              className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
            >
              Fortsätt
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setConfirmOff(false)}
              className="flex-1 rounded-lg border border-[#3A4048] px-3 py-2 text-xs font-semibold text-[#B0B6BE]"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
