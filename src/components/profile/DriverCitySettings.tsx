"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DEFAULT_DRIVER_CITY,
  DRIVER_CITY_OPTIONS,
  DRIVER_CITY_OTHER_MARKER,
  isValidDriverCitySelection,
  resolveDriverCity,
  splitDriverCityStored,
} from "@/lib/driver-city";
import type { Profile } from "@/lib/types/database";

interface DriverCitySettingsProps {
  userId: string;
  profile: Profile;
  onChange: (profile: Profile) => void;
  disabled?: boolean;
}

export function DriverCitySettings({
  userId,
  profile,
  onChange,
  disabled,
}: DriverCitySettingsProps) {
  const [selection, setSelection] = useState<typeof DRIVER_CITY_OPTIONS[number]>(
    DEFAULT_DRIVER_CITY
  );
  const [customCity, setCustomCity] = useState("");
  const [savingCity, setSavingCity] = useState(false);
  const [savingNational, setSavingNational] = useState(false);
  const [citySaved, setCitySaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const split = splitDriverCityStored(profile.driver_city);
    setSelection(split.selection);
    setCustomCity(split.customCity);
  }, [profile.driver_city]);

  async function handleSaveCity() {
    if (
      !isValidDriverCitySelection(selection, customCity, {
        requireCustomForOther: false,
      })
    ) {
      setError("Välj en giltig stad.");
      return;
    }

    setSavingCity(true);
    setError(null);
    setCitySaved(false);

    const resolvedCity = resolveDriverCity(selection, customCity);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        driver_city: resolvedCity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    setSavingCity(false);

    if (dbError) {
      setError("Det gick inte att spara staden. Försök igen.");
      return;
    }

    onChange({ ...profile, driver_city: resolvedCity });
    setCitySaved(true);
    window.setTimeout(() => setCitySaved(false), 4000);
  }

  async function toggleNationalEmergencies(enabled: boolean) {
    setSavingNational(true);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        show_national_emergencies: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (!dbError) {
      onChange({ ...profile, show_national_emergencies: enabled });
    }
    setSavingNational(false);
  }

  return (
    <section className="mb-4 rounded-2xl border border-card-border bg-card p-4">
      <h2 className="text-base font-semibold">🏙 Stad</h2>

      <div className="mt-4 space-y-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Din körstad</span>
          <select
            className="field"
            value={selection}
            onChange={(e) => {
              setSelection(e.target.value as typeof selection);
              setCitySaved(false);
              setError(null);
            }}
            disabled={disabled || savingCity}
          >
            {DRIVER_CITY_OPTIONS.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>

        {selection === DRIVER_CITY_OTHER_MARKER && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Ange stad (valfritt)</span>
            <input
              className="field"
              value={customCity}
              onChange={(e) => {
                setCustomCity(e.target.value);
                setCitySaved(false);
                setError(null);
              }}
              placeholder="T.ex. Uppsala"
              disabled={disabled || savingCity}
            />
            <span className="text-xs text-muted">
              Utan egen stad visas inga lokala rapporter som standard.
            </span>
          </label>
        )}

        <p className="text-xs text-muted leading-relaxed">
          Du får främst varningar från din valda stad. Taxi i nöd kan visas
          enligt dina säkerhetsinställningar.
        </p>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        {citySaved && (
          <p className="text-sm text-success" role="status">
            ✅ Stad sparad.
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleSaveCity()}
          disabled={disabled || savingCity}
          className="btn-primary w-full"
        >
          {savingCity ? "Sparar…" : "Spara"}
        </button>
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-card-border/80 bg-background/40 p-3">
        <input
          type="checkbox"
          checked={profile.show_national_emergencies}
          disabled={disabled || savingNational}
          onChange={(e) => void toggleNationalEmergencies(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-accent"
        />
        <span className="text-sm leading-snug">
          <span className="font-medium">Visa nationella nödlägen</span>
          <span className="mt-1 block text-xs text-muted">
            Taxi i nöd-varningar från hela landet visas oavsett stad.
          </span>
        </span>
      </label>
    </section>
  );
}
