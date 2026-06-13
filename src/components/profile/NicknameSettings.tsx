"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAppToast } from "@/components/ui/AppToast";
import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_PRIVACY_EXPLANATION,
  NICKNAME_TAKEN_MESSAGE,
} from "@/lib/driver-nickname";
import { publicDriverLabel } from "@/lib/driver-display";
import type { Profile } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface NicknameSettingsProps {
  profile: Profile;
  onUpdated: (nickname: string) => void;
}

export function NicknameSettings({ profile, onUpdated }: NicknameSettingsProps) {
  const showToast = useAppToast();
  const [nickname, setNickname] = useState(profile.nickname ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentLabel = publicDriverLabel(profile);
  const unchanged =
    nickname.trim() === (profile.nickname ?? "").trim() ||
    nickname.trim().length === 0;

  async function handleSave() {
    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/profile/nickname", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
      });
      const data = (await res.json()) as { error?: string; nickname?: string };

      if (!res.ok) {
        const message =
          res.status === 409
            ? NICKNAME_TAKEN_MESSAGE
            : data.error ?? "Kunde inte spara smeknamn.";
        setError(message);
        return;
      }

      const saved = data.nickname ?? nickname.trim();
      onUpdated(saved);
      setNickname(saved);
      showToast("✓ Visningsnamn sparat");
    } catch {
      setError("Nätverksfel. Försök igen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-card-border bg-card p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
        Visningsnamn
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/90">
        {NICKNAME_PRIVACY_EXPLANATION}
      </p>
      <p className="mt-3 text-xs text-muted">
        Visas i nätverket som:{" "}
        <span className="font-semibold text-foreground">{currentLabel}</span>
      </p>

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-sm text-muted">Smeknamn</span>
        <input
          className="field text-base"
          value={nickname}
          onChange={(event) => {
            setNickname(event.target.value);
            setError(null);
          }}
          maxLength={NICKNAME_MAX_LENGTH}
          placeholder="T.ex. Jim On Road"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={saving}
        />
      </label>

      {error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving || unchanged}
        className={cn(
          "btn-primary mt-4 w-full !min-h-[48px]",
          (saving || unchanged) && "opacity-50"
        )}
      >
        {saving ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Sparar…
          </>
        ) : (
          "Spara visningsnamn"
        )}
      </button>
    </div>
  );
}
