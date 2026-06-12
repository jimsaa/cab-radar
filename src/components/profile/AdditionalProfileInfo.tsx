"use client";

import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types/database";
import {
  splitTaxiOperator,
  TAXIMETER_TYPE_OPTIONS,
  TAXI_OPERATOR_OPTIONS,
} from "@/lib/profile-taxi-info";

interface AdditionalProfileInfoProps {
  userId: string;
  profile: Profile;
  onReload: (profile: Profile) => void;
}

export function AdditionalProfileInfo({
  userId,
  profile,
  onReload,
}: AdditionalProfileInfoProps) {
  const [companyName, setCompanyName] = useState("");
  const [operatorPreset, setOperatorPreset] = useState("");
  const [operatorCustom, setOperatorCustom] = useState("");
  const [taxiNumber, setTaxiNumber] = useState("");
  const [taximeterType, setTaximeterType] = useState("");
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCompanyName(profile.taxi_company_name ?? "");
    const { preset, custom } = splitTaxiOperator(profile.taxi_operator);
    setOperatorPreset(preset);
    setOperatorCustom(custom);
    setTaxiNumber(profile.taxi_number ?? "");
    setTaximeterType(profile.taximeter_type ?? "");
  }, [profile]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const payload = {
      taxi_company_name: companyName,
      taxi_operator_preset: operatorPreset,
      taxi_operator_custom: operatorCustom,
      taxi_number: taxiNumber,
      taximeter_type: taximeterType,
    };

    if (process.env.NODE_ENV === "development") {
      console.log("[PROFILE] Saving...", { userId, payload });
    }

    try {
      const res = await fetch("/api/profile/taxi-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        profile?: Profile;
      };

      if (process.env.NODE_ENV === "development") {
        console.log("[PROFILE] Supabase response:", data);
      }

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Det gick inte att spara. Försök igen.");
        return;
      }

      if (data.profile) {
        if (process.env.NODE_ENV === "development") {
          console.log("[PROFILE] Reloaded profile:", data.profile);
        }
        onReload(data.profile);
      }

      setSuccessMessage(data.message ?? "Profilen har uppdaterats.");
      window.setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error("[PROFILE] Save failed:", err);
      setError("Nätverksfel. Försök igen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-4 rounded-2xl border border-card-border bg-card p-4">
      <h2 className="text-base font-semibold">Ytterligare information</h2>
      <p className="mt-2 text-sm text-muted leading-relaxed">
        Denna information är frivillig och hjälper oss att förbättra CabRadar och
        anpassa framtida funktioner och erbjudanden.
      </p>
      <p className="mt-1 text-sm text-muted">Du kan fylla i detta nu eller senare.</p>

      <div className="mt-4 space-y-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Taxiföretag</span>
          <input
            className="field"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Ex. Saari Taxi AB"
            disabled={saving}
          />
          <span className="text-xs text-muted">Ditt eget taxiföretag.</span>
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Taxibolag</span>
          <select
            className="field"
            value={operatorPreset}
            onChange={(e) => setOperatorPreset(e.target.value)}
            disabled={saving}
          >
            <option value="">Välj taxibolag</option>
            {TAXI_OPERATOR_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {operatorPreset === "Annat" && (
            <input
              className="field mt-1"
              value={operatorCustom}
              onChange={(e) => setOperatorCustom(e.target.value)}
              placeholder="Ange taxibolag"
              disabled={saving}
            />
          )}
          <span className="text-xs text-muted">
            Vilket bolag kör du främst för?
          </span>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Taxinummer</span>
          <input
            className="field"
            value={taxiNumber}
            onChange={(e) => setTaxiNumber(e.target.value)}
            placeholder="Ex. 123"
            disabled={saving}
          />
          <span className="text-xs text-muted">Bilens taxinummer.</span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Typ av taxameter</span>
          <select
            className="field"
            value={taximeterType}
            onChange={(e) => setTaximeterType(e.target.value)}
            disabled={saving}
          >
            <option value="">Välj taxameter</option>
            {TAXIMETER_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted">Vilken taxameter använder du?</span>
        </label>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {successMessage && (
        <p className="mt-3 text-sm text-success" role="status">
          {successMessage}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="btn-primary mt-4 w-full"
      >
        {saving ? "Sparar..." : "Spara"}
      </button>
    </section>
  );
}
