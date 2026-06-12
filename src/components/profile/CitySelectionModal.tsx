"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

interface CitySelectionModalProps {
  userId: string;
  profile: Profile;
  onSaved: (profile: Profile) => void;
}

export function CitySelectionModal({
  userId,
  profile,
  onSaved,
}: CitySelectionModalProps) {
  const router = useRouter();
  const [selection, setSelection] = useState<typeof DRIVER_CITY_OPTIONS[number]>(
    DEFAULT_DRIVER_CITY
  );
  const [customCity, setCustomCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const split = splitDriverCityStored(profile.driver_city);
    setSelection(split.selection);
    setCustomCity(split.customCity);
  }, [profile.driver_city]);

  async function handleSave() {
    if (
      !isValidDriverCitySelection(selection, customCity, {
        requireCustomForOther: false,
      })
    ) {
      setError("Välj en giltig stad.");
      return;
    }

    setSaving(true);
    setError(null);

    const resolvedCity = resolveDriverCity(selection, customCity);
    const supabase = createClient();
    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        driver_city: resolvedCity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    setSaving(false);

    if (dbError) {
      setError("Det gick inte att spara staden. Försök igen.");
      return;
    }

    const updated = { ...profile, driver_city: resolvedCity };
    onSaved(updated);
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="city-selection-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-card-border bg-card p-5 shadow-xl">
        <h2 id="city-selection-title" className="text-lg font-bold">
          🏙 Välj stad
        </h2>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          Välj vilken stad du främst kör i för att få relevanta varningar.
        </p>

        <div className="mt-4 space-y-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Din körstad</span>
            <select
              className="field"
              value={selection}
              onChange={(e) => {
                setSelection(e.target.value as typeof selection);
                setError(null);
              }}
              disabled={saving}
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
                  setError(null);
                }}
                placeholder="T.ex. Uppsala"
                disabled={saving}
              />
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

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="btn-primary w-full !min-h-[48px]"
          >
            {saving ? "Sparar…" : "Spara och fortsätt"}
          </button>
        </div>
      </div>
    </div>
  );
}
