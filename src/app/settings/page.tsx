"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { User } from "lucide-react";
import type { Profile } from "@/lib/types/database";
import {
  VerificationStatusBanner,
  VerificationStatusBadge,
} from "@/components/verification/VerificationStatusBanner";
import { MembershipCard } from "@/components/membership/MembershipCard";
import { CommunicationHub, SupportLink, PartnerLink } from "@/components/communication/CommunicationHub";
import { canParticipateInRewards } from "@/lib/verification";
import { isVerifiedDriver, isBetaUser } from "@/lib/membership";
import { maskLicenceLast4 } from "@/lib/licence.shared";
import { syncMembershipProfile } from "@/lib/profile";
import { AdditionalProfileInfo } from "@/components/profile/AdditionalProfileInfo";
import { AlertRegionSettings } from "@/components/profile/AlertRegionSettings";
import { TestModeSettings } from "@/components/test-mode/TestModeSettings";
import { PushNotificationsSection } from "@/components/notifications/PushNotificationsSection";
import { NAV } from "@/lib/constants";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const synced = await syncMembershipProfile(supabase, user.id);
      if (synced) setProfile(synced);
    }
    load();
  }, []);

  async function updateSetting(
    field: "fab_enabled" | "alert_chime_enabled",
    value: boolean
  ) {
    if (!userId) return;
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq("id", userId);
    setProfile((p) => (p ? { ...p, [field]: value } : p));
    setSaving(false);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (!userId) {
    return (
      <div className="safe-bottom mx-auto max-w-lg px-4 py-8 text-center">
        <p className="text-muted">Logga in för inställningar.</p>
        <Link href="/login" className="mt-4 inline-block btn-primary">
          Logga in
        </Link>
      </div>
    );
  }

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 pb-4">
      <h1 className="py-4 text-xl font-bold">{NAV.settings}</h1>

      {profile && (
        <div className="mb-4 rounded-2xl border border-card-border bg-card p-4">
          <div className="flex items-start gap-3">
            <User className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{profile.display_name ?? "Förare"}</p>
              {profile.cabradar_user_id && (
                <p className="mt-1 text-sm">
                  Ditt användar-ID:{" "}
                  <span className="font-mono font-bold text-accent-bright">
                    {profile.cabradar_user_id}
                  </span>
                </p>
              )}
              {profile.driver_license_last4 && (
                <p className="mt-1 text-xs text-muted">
                  Taxiförarleg.: {maskLicenceLast4(profile.driver_license_last4)}
                </p>
              )}
              <div className="mt-2">
                <VerificationStatusBadge status={profile.verification_status} />
              </div>
              {isBetaUser(profile) && (
                <p className="mt-2 inline-flex items-center rounded-full border border-card-border bg-background/60 px-2.5 py-0.5 text-xs text-muted">
                  🧪 Beta-testare
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-4">
                <SupportLink variant="link" className="text-xs" />
                <PartnerLink className="text-xs" />
              </div>
            </div>
          </div>
        </div>
      )}

      {profile && !isVerifiedDriver(profile) && (
        <VerificationStatusBanner
          status={profile.verification_status}
          className="mb-4"
        />
      )}

      {profile && (
        <div className="mb-4">
          <MembershipCard profile={profile} />
        </div>
      )}

      {profile && userId && (
        <AdditionalProfileInfo
          userId={userId}
          profile={profile}
          onReload={(updated) => setProfile(updated)}
        />
      )}

      {profile && userId && isVerifiedDriver(profile) && (
        <div className="mb-4">
          <TestModeSettings
            userId={userId}
            profile={profile}
            onChange={setProfile}
          />
        </div>
      )}

      {profile && userId && isVerifiedDriver(profile) && (
        <div className="mb-4">
          <AlertRegionSettings
            userId={userId}
            profile={profile}
            disabled={saving}
            onChange={setProfile}
          />
        </div>
      )}

      {profile && userId && (
        <PushNotificationsSection
          userId={userId}
          pushEnabled={profile.push_enabled}
          isAdmin={profile.is_admin}
          disabled={saving}
          onChange={(enabled, prompted) =>
            setProfile((p) =>
              p
                ? {
                    ...p,
                    push_enabled: enabled,
                    push_prompted: prompted ?? p.push_prompted,
                  }
                : p
            )
          }
        />
      )}

      <div className="space-y-3">
        <label className="flex items-center justify-between rounded-2xl border border-card-border bg-card p-4">
          <div>
            <p className="font-medium">Snabbknapp +</p>
            <p className="text-sm text-muted">Flytande knapp på radarn</p>
          </div>
          <input
            type="checkbox"
            checked={profile?.fab_enabled ?? true}
            disabled={saving}
            onChange={(e) => updateSetting("fab_enabled", e.target.checked)}
            className="h-6 w-6 accent-accent"
          />
        </label>

        <label className="flex items-center justify-between rounded-2xl border border-card-border bg-card p-4">
          <div>
            <p className="font-medium">Ljudsignal</p>
            <p className="text-sm text-muted">Vid viktiga varningar</p>
          </div>
          <input
            type="checkbox"
            checked={profile?.alert_chime_enabled ?? true}
            disabled={saving}
            onChange={(e) =>
              updateSetting("alert_chime_enabled", e.target.checked)
            }
            className="h-6 w-6 accent-accent"
          />
        </label>
      </div>

      {profile && (
        <div className="mt-6 rounded-2xl border border-card-border bg-card p-4">
          <p className="text-sm font-medium text-muted">Poäng</p>
          {canParticipateInRewards(profile) ? (
            <div className="mt-2 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <div>
                <p className="text-lg font-bold">{profile.reputation_score}</p>
                <p className="text-xs text-muted">Poäng</p>
              </div>
              <div>
                <p className="text-lg font-bold">
                  {profile.monthly_reports_count}
                </p>
                <p className="text-xs text-muted">Denna månad</p>
              </div>
              <div>
                <p className="text-lg font-bold">
                  {profile.total_approved_reports}
                </p>
                <p className="text-xs text-muted">Totalt skickade</p>
              </div>
              <div>
                <p className="text-lg font-bold text-muted">
                  {profile.reward_points_balance}
                </p>
                <p className="text-xs text-muted">Saldo</p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Verifiera ditt leg. för att samla poäng.
            </p>
          )}
        </div>
      )}

      <div className="mt-8 border-t border-card-border pt-5">
        <CommunicationHub isLoggedIn />
      </div>

      <button
        type="button"
        onClick={signOut}
        className="mt-6 btn-secondary w-full"
      >
        Logga ut
      </button>
    </div>
  );
}
