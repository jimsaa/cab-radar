"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Phone, X } from "lucide-react";
import {
  ADMIN_MEMBERSHIP_PLAN_LABELS,
  adminUserStatusBadges,
  profileToEditorForm,
  type AdminMembershipPlan,
  type AdminUserDetail,
  type AdminUserEditorForm,
} from "@/lib/admin-user-editor";
import { formatSwedishDate } from "@/lib/datetime";
import { adminDriverRealName, publicDriverLabel } from "@/lib/driver-display";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types/database";

interface AdminUserEditorProps {
  userId: string;
  initialProfile?: Profile | null;
  isAdmin: boolean;
  onClose: () => void;
  onSaved: (profile: Profile) => void;
}

function LargeToggle({
  label,
  description,
  checked,
  disabled,
  onChange,
  variant = "default",
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  variant?: "default" | "large" | "danger";
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-4 rounded-2xl border px-5 py-4 transition-colors",
        variant === "danger"
          ? "border-red-500/30 bg-red-500/5"
          : variant === "large"
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-[#3A4048] bg-[#1B1E22]/80",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-white">{label}</span>
        {description && (
          <span className="mt-1 block text-sm text-[#8A9099]">{description}</span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-10 w-[72px] shrink-0 rounded-full transition-colors",
          checked
            ? variant === "danger"
              ? "bg-red-500"
              : variant === "large"
                ? "bg-amber-500"
                : "bg-[#22C55E]"
            : "bg-[#3A4048]"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-8 w-8 rounded-full bg-white shadow transition-transform",
            checked ? "left-[34px]" : "left-1"
          )}
        />
      </button>
    </label>
  );
}

function PermissionCheck({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-[#3A4048] bg-[#1B1E22]/80 px-5 py-4">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-6 w-6 shrink-0 accent-[#42A5F5]"
      />
      <span className="text-base font-medium text-white">{label}</span>
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-widest text-[#F4C430]">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[#B0B6BE]">{label}</span>
      {children}
    </label>
  );
}

const editorFieldClass =
  "w-full rounded-2xl border border-[#3A4048] bg-[#262B31] px-5 py-4 text-lg text-white placeholder:text-[#6B7280] focus:border-[#42A5F5] focus:outline-none focus:ring-2 focus:ring-[#42A5F5]/30";

export function AdminUserEditor({
  userId,
  initialProfile,
  isAdmin,
  onClose,
  onSaved,
}: AdminUserEditorProps) {
  const [loading, setLoading] = useState(!initialProfile);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<AdminUserDetail | null>(
    initialProfile ? { ...initialProfile, email: null } : null
  );
  const [form, setForm] = useState<AdminUserEditorForm | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      const data = (await res.json()) as {
        ok?: boolean;
        user?: AdminUserDetail;
        error?: string;
      };
      if (!res.ok || !data.user) {
        setFeedback({
          type: "error",
          message: data.error ?? "Kunde inte hämta användaren.",
        });
        return;
      }
      setDetail(data.user);
      setForm(profileToEditorForm(data.user));
    } catch {
      setFeedback({
        type: "error",
        message: "Kunde inte hämta användaren.",
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  function patchForm(partial: Partial<AdminUserEditorForm>) {
    setForm((prev) => (prev ? { ...prev, ...partial } : prev));
    setFeedback(null);
  }

  async function handleSave() {
    if (!form || !isAdmin) return;

    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, driverId: userId }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        user?: AdminUserDetail;
      };

      if (!res.ok || !data.ok) {
        setFeedback({
          type: "error",
          message: data.error ?? "Det gick inte att spara.",
        });
        return;
      }

      if (data.user) {
        setDetail(data.user);
        setForm(profileToEditorForm(data.user));
        onSaved(data.user);
      }

      setFeedback({
        type: "success",
        message: data.message ?? "✅ Användaren uppdaterades.",
      });
    } catch {
      setFeedback({
        type: "error",
        message: "Det gick inte att spara.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleBlock() {
    patchForm({ blocked: true });
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          driverId: userId,
          blocked: true,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        user?: AdminUserDetail;
      };
      if (res.ok && data.user) {
        setDetail(data.user);
        setForm(profileToEditorForm(data.user));
        onSaved(data.user);
        setFeedback({ type: "success", message: "✅ Användaren blockerades." });
      } else {
        setFeedback({
          type: "error",
          message: data.error ?? "Kunde inte blockera användaren.",
        });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!isAdmin) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/reset-user-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: userId }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setFeedback({
          type: "error",
          message: data.error ?? "Kunde inte skicka återställningslänk.",
        });
        return;
      }
      setFeedback({
        type: "success",
        message: data.message ?? "✅ Återställningslänk skickad.",
      });
    } catch {
      setFeedback({
        type: "error",
        message: "Kunde inte skicka återställningslänk.",
      });
    } finally {
      setSaving(false);
    }
  }

  const badges = detail ? adminUserStatusBadges(detail) : [];
  const realName = detail ? adminDriverRealName(detail) : null;
  const phone = form?.phoneNumber?.replace(/\s/g, "");

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-[96dvh] w-full max-w-2xl flex-col rounded-t-3xl border border-[#3A4048] bg-[#1E2125] shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-editor-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#3A4048] px-6 py-5">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-[#8A9099]">
              Användarredigering
            </p>
            <h2
              id="admin-user-editor-title"
              className="mt-1 truncate text-2xl font-bold text-white"
            >
              {detail ? publicDriverLabel(detail) : "Laddar…"}
            </h2>
            {realName && (
              <p className="mt-1 text-base text-[#B0B6BE]">{realName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-3 text-[#8A9099] hover:bg-[#262B31] hover:text-white"
            aria-label="Stäng"
          >
            <X className="h-6 w-6" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {loading && !form ? (
            <div className="flex items-center justify-center py-20 text-[#8A9099]">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              Hämtar användare…
            </div>
          ) : form && detail ? (
            <div className="space-y-8">
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {badges.map((badge) => (
                    <span
                      key={badge.label}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
                        badge.className
                      )}
                    >
                      <span>{badge.emoji}</span>
                      {badge.label}
                    </span>
                  ))}
                </div>
              )}

              {feedback && (
                <p
                  role="alert"
                  className={cn(
                    "rounded-2xl px-5 py-4 text-base",
                    feedback.type === "success"
                      ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border border-red-500/30 bg-red-500/10 text-red-300"
                  )}
                >
                  {feedback.message}
                </p>
              )}

              <Section title="Header">
                <div className="space-y-4">
                  <Field label="Nickname">
                    <input
                      className={cn(editorFieldClass, "text-2xl font-bold")}
                      value={form.nickname}
                      disabled={!isAdmin || saving}
                      onChange={(e) => patchForm({ nickname: e.target.value })}
                    />
                  </Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="E-post">
                      <input
                        type="email"
                        className={editorFieldClass}
                        value={form.email}
                        disabled={!isAdmin || saving}
                        onChange={(e) => patchForm({ email: e.target.value })}
                      />
                    </Field>
                    <Field label="Telefon">
                      <input
                        type="tel"
                        className={editorFieldClass}
                        value={form.phoneNumber}
                        disabled={!isAdmin || saving}
                        onChange={(e) =>
                          patchForm({ phoneNumber: e.target.value })
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Användar-ID">
                    <input
                      className={cn(editorFieldClass, "font-mono text-base")}
                      value={detail.cabradar_user_id ?? detail.id}
                      readOnly
                    />
                  </Field>
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-[#3A4048] bg-[#262B31] px-5 py-4 text-base font-semibold text-white"
                    >
                      <Phone className="h-5 w-5" />
                      Ring upp
                    </a>
                  )}
                </div>
              </Section>

              <Section title="Medlemskap">
                <Field label="Membership type">
                  <select
                    className={editorFieldClass}
                    value={form.membershipPlan}
                    disabled={!isAdmin || saving || detail.is_admin}
                    onChange={(e) =>
                      patchForm({
                        membershipPlan: e.target.value as AdminMembershipPlan,
                      })
                    }
                  >
                    {(
                      Object.entries(ADMIN_MEMBERSHIP_PLAN_LABELS) as [
                        AdminMembershipPlan,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="space-y-3">
                  <LargeToggle
                    label="Founder Badge"
                    checked={form.founderBadge}
                    disabled={!isAdmin || saving || detail.is_admin}
                    onChange={(founderBadge) => patchForm({ founderBadge })}
                  />
                  <LargeToggle
                    label="Beta User"
                    checked={form.betaUser}
                    disabled={!isAdmin || saving || detail.is_admin}
                    onChange={(betaUser) => patchForm({ betaUser })}
                  />
                  <LargeToggle
                    label="Trial Active"
                    checked={form.trialActive}
                    disabled={!isAdmin || saving || detail.is_admin}
                    onChange={(trialActive) => patchForm({ trialActive })}
                  />
                  <LargeToggle
                    label="Active Driver"
                    checked={form.activeDriver}
                    disabled={!isAdmin || saving || detail.is_admin}
                    onChange={(activeDriver) => patchForm({ activeDriver })}
                  />
                  <LargeToggle
                    label="Blocked"
                    variant="danger"
                    checked={form.blocked}
                    disabled={!isAdmin || saving || detail.is_admin}
                    onChange={(blocked) => patchForm({ blocked })}
                  />
                  <LargeToggle
                    label="Test Mode"
                    variant="large"
                    checked={form.testMode}
                    disabled={!isAdmin || saving || detail.is_admin}
                    onChange={(testMode) => patchForm({ testMode })}
                  />
                  <LargeToggle
                    label="Co-Admin"
                    variant="large"
                    checked={form.coAdmin}
                    disabled={!isAdmin || saving || detail.is_admin}
                    onChange={(coAdmin) =>
                      patchForm({
                        coAdmin,
                        permEmergencyAdmin: coAdmin
                          ? form.permEmergencyAdmin
                          : false,
                        permCivilModeration: coAdmin
                          ? form.permCivilModeration
                          : false,
                        permUserModeration: coAdmin
                          ? form.permUserModeration
                          : false,
                      })
                    }
                  />
                </div>
              </Section>

              <Section title="Behörigheter">
                <div className="space-y-3">
                  <PermissionCheck
                    label="Tesla View"
                    checked={form.permTeslaView}
                    disabled={!isAdmin || saving || detail.is_admin}
                    onChange={(permTeslaView) => patchForm({ permTeslaView })}
                  />
                  <PermissionCheck
                    label="Taxi i nöd administration"
                    checked={form.permEmergencyAdmin}
                    disabled={
                      !isAdmin || saving || detail.is_admin || !form.coAdmin
                    }
                    onChange={(permEmergencyAdmin) =>
                      patchForm({ permEmergencyAdmin })
                    }
                  />
                  <PermissionCheck
                    label="Civil moderation"
                    checked={form.permCivilModeration}
                    disabled={
                      !isAdmin || saving || detail.is_admin || !form.coAdmin
                    }
                    onChange={(permCivilModeration) =>
                      patchForm({ permCivilModeration })
                    }
                  />
                  <PermissionCheck
                    label="User moderation"
                    checked={form.permUserModeration}
                    disabled={
                      !isAdmin || saving || detail.is_admin || !form.coAdmin
                    }
                    onChange={(permUserModeration) =>
                      patchForm({ permUserModeration })
                    }
                  />
                </div>
              </Section>

              <Section title="Profil">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nickname">
                    <input
                      className={editorFieldClass}
                      value={form.nickname}
                      disabled={!isAdmin || saving}
                      onChange={(e) => patchForm({ nickname: e.target.value })}
                    />
                  </Field>
                  <Field label="Förnamn">
                    <input
                      className={editorFieldClass}
                      value={form.firstName}
                      disabled={!isAdmin || saving}
                      onChange={(e) => patchForm({ firstName: e.target.value })}
                    />
                  </Field>
                  <Field label="Efternamn">
                    <input
                      className={editorFieldClass}
                      value={form.lastName}
                      disabled={!isAdmin || saving}
                      onChange={(e) => patchForm({ lastName: e.target.value })}
                    />
                  </Field>
                  <Field label="E-post">
                    <input
                      type="email"
                      className={editorFieldClass}
                      value={form.email}
                      disabled={!isAdmin || saving}
                      onChange={(e) => patchForm({ email: e.target.value })}
                    />
                  </Field>
                  <Field label="Telefon">
                    <input
                      type="tel"
                      className={editorFieldClass}
                      value={form.phoneNumber}
                      disabled={!isAdmin || saving}
                      onChange={(e) =>
                        patchForm({ phoneNumber: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Statistik">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {[
                    {
                      label: "Rapporter",
                      value: detail.total_approved_reports,
                    },
                    { label: "Röster", value: detail.monthly_votes_count },
                    { label: "Poäng", value: detail.reward_points_balance },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-[#3A4048] bg-[#1B1E22]/80 px-5 py-4 text-center"
                    >
                      <p className="text-sm text-[#8A9099]">{stat.label}</p>
                      <p className="mt-1 text-3xl font-bold text-white">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#3A4048] bg-[#1B1E22]/80 px-5 py-4">
                    <p className="text-sm text-[#8A9099]">Gick med</p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {formatSwedishDate(detail.created_at)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#3A4048] bg-[#1B1E22]/80 px-5 py-4">
                    <p className="text-sm text-[#8A9099]">Senast aktiv</p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {formatSwedishDate(
                        detail.last_known_at ?? detail.updated_at
                      )}
                    </p>
                  </div>
                </div>
              </Section>
            </div>
          ) : (
            <p className="py-12 text-center text-[#8A9099]">
              Kunde inte ladda användaren.
            </p>
          )}
        </div>

        <footer className="shrink-0 space-y-3 border-t border-[#3A4048] px-6 py-5">
          <button
            type="button"
            disabled={!isAdmin || saving || !form}
            onClick={() => void handleSave()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#42A5F5] px-6 py-5 text-lg font-bold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Spara ändringar
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-2xl border border-[#3A4048] bg-[#262B31] px-4 py-4 text-base font-semibold text-[#B0B6BE]"
            >
              Avbryt
            </button>
            <button
              type="button"
              disabled={!isAdmin || saving || !form || detail?.is_admin}
              onClick={() => void handleBlock()}
              className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-4 text-base font-semibold text-red-300 disabled:opacity-50"
            >
              Blockera användare
            </button>
          </div>
          <button
            type="button"
            disabled={!isAdmin || saving}
            onClick={() => void handleResetPassword()}
            className="w-full rounded-2xl border border-[#3A4048] bg-[#262B31] px-4 py-4 text-base font-semibold text-[#B0B6BE] disabled:opacity-50"
          >
            Återställ lösenord
          </button>
        </footer>
      </div>
    </div>
  );
}
