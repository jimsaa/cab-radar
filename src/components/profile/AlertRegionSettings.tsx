"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDriverCityLabel } from "@/lib/driver-city";
import type { Profile } from "@/lib/types/database";

interface AlertRegionSettingsProps {
  userId: string;
  profile: Profile;
  onChange: (profile: Profile) => void;
  disabled?: boolean;
}

export function AlertRegionSettings({
  userId,
  profile,
  onChange,
  disabled,
}: AlertRegionSettingsProps) {
  const [saving, setSaving] = useState(false);

  async function toggleNationalEmergencies(enabled: boolean) {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        show_national_emergencies: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (!error) {
      onChange({ ...profile, show_national_emergencies: enabled });
    }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-card-border bg-card p-4">
      <p className="font-medium">Din stad</p>
      <p className="mt-1 text-sm text-muted">
        {formatDriverCityLabel(profile.driver_city)}
      </p>
      <p className="mt-2 text-xs text-muted leading-relaxed">
        Du ser rapporter från din stad. Normala varningar filtreras efter stad.
      </p>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-card-border/80 bg-background/40 p-3">
        <input
          type="checkbox"
          checked={profile.show_national_emergencies}
          disabled={disabled || saving}
          onChange={(e) => void toggleNationalEmergencies(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-accent"
        />
        <span className="text-sm leading-snug">
          <span className="font-medium">Visa även nationella nödlägen</span>
          <span className="mt-1 block text-xs text-muted">
            Taxi i nöd-varningar från hela landet visas oavsett stad. Övriga
            rapporter följer din stad.
          </span>
        </span>
      </label>
    </div>
  );
}
