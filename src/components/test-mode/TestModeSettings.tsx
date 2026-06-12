"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DISABLE_TEST_MODE_CONFIRM } from "@/lib/test-mode";
import { recordDriverActivityFromDevice } from "@/lib/driver-activity-client";
import type { Profile } from "@/lib/types/database";

interface TestModeSettingsProps {
  userId: string;
  profile: Profile;
  isAdminViewer?: boolean;
  onChange: (profile: Profile) => void;
}

export function TestModeSettings({
  userId,
  profile,
  isAdminViewer = false,
  onChange,
}: TestModeSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);

  async function setTestMode(enabled: boolean) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        test_mode_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (!error) {
      onChange({ ...profile, test_mode_enabled: enabled });
      setConfirmOff(false);
      void recordDriverActivityFromDevice("test_mode");
    }
    setSaving(false);
  }

  function handleToggle(next: boolean) {
    if (!next && profile.test_mode_enabled && !isAdminViewer) {
      setConfirmOff(true);
      return;
    }
    void setTestMode(next);
  }

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={profile.test_mode_enabled}
          disabled={saving}
          onChange={(e) => handleToggle(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-amber-500"
        />
        <span className="text-sm leading-snug">
          <span className="font-medium">Testläge aktivt</span>
          <span className="mt-1 block text-xs text-muted leading-relaxed">
            Alla rapporter och Civilkoll-anmälningar markeras som test. Inga
            push-notiser eller live-statistik påverkas.
            {isAdminViewer
              ? " Administratörer kan tvinga testläge på/av."
              : " Stäng av när du är redo för riktiga rapporter."}
          </span>
        </span>
      </label>

      {confirmOff && (
        <div className="mt-4 rounded-xl border border-card-border bg-background/90 p-4">
          <p className="text-sm leading-relaxed text-muted">
            {DISABLE_TEST_MODE_CONFIRM}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void setTestMode(false)}
              className="btn-primary flex-1 text-sm"
            >
              Fortsätt
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setConfirmOff(false)}
              className="btn-secondary flex-1 text-sm"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
