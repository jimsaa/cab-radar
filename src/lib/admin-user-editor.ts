import type { Profile } from "./types/database";

export type AdminMembershipPlan =
  | "free_trial"
  | "premium_monthly"
  | "premium_yearly"
  | "founder"
  | "beta_user";

export const ADMIN_MEMBERSHIP_PLAN_LABELS: Record<AdminMembershipPlan, string> =
  {
    free_trial: "Free Trial",
    premium_monthly: "Premium Monthly",
    premium_yearly: "Premium Yearly",
    founder: "Founder",
    beta_user: "Beta User",
  };

export interface AdminUserDetail extends Profile {
  email: string | null;
}

export interface AdminUserEditorForm {
  nickname: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  membershipPlan: AdminMembershipPlan;
  founderBadge: boolean;
  betaUser: boolean;
  trialActive: boolean;
  activeDriver: boolean;
  blocked: boolean;
  testMode: boolean;
  coAdmin: boolean;
  permTeslaView: boolean;
  permEmergencyAdmin: boolean;
  permCivilModeration: boolean;
  permUserModeration: boolean;
}

export function splitDisplayName(displayName: string | null): {
  firstName: string;
  lastName: string;
} {
  const trimmed = displayName?.trim() ?? "";
  if (!trimmed) return { firstName: "", lastName: "" };
  const space = trimmed.indexOf(" ");
  if (space === -1) return { firstName: trimmed, lastName: "" };
  return {
    firstName: trimmed.slice(0, space),
    lastName: trimmed.slice(space + 1).trim(),
  };
}

export function joinDisplayName(firstName: string, lastName: string): string {
  return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
}

export function profileToMembershipPlan(
  profile: Pick<
    Profile,
    "membership_type" | "beta_user" | "tesla_beta" | "founder_badge"
  >
): AdminMembershipPlan {
  if (profile.founder_badge) return "founder";
  if (profile.tesla_beta || profile.membership_type === "tesla_beta") {
    return "beta_user";
  }
  if (profile.beta_user) return "beta_user";
  if (profile.membership_type === "annual_member") return "premium_yearly";
  if (profile.membership_type === "active_driver") return "premium_monthly";
  return "free_trial";
}

export function profileToEditorForm(
  profile: AdminUserDetail
): AdminUserEditorForm {
  const { firstName, lastName } = splitDisplayName(profile.display_name);

  return {
    nickname: profile.nickname ?? "",
    firstName,
    lastName,
    email: profile.email ?? "",
    phoneNumber: profile.phone_number ?? "",
    membershipPlan: profileToMembershipPlan(profile),
    founderBadge: profile.founder_badge,
    betaUser: profile.beta_user,
    trialActive: profile.trial_active,
    activeDriver:
      profile.membership_type === "active_driver" &&
      profile.verification_status === "verified",
    blocked: profile.verification_status === "rejected",
    testMode: profile.test_mode_enabled,
    coAdmin: profile.is_co_admin,
    permTeslaView: profile.tesla_view_enabled,
    permEmergencyAdmin: profile.co_admin_emergency_call,
    permCivilModeration: profile.co_admin_civil_moderation,
    permUserModeration: profile.co_admin_user_moderation,
  };
}

export interface AdminUserEditorSavePayload {
  driverId: string;
  nickname: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  membershipPlan: AdminMembershipPlan;
  founderBadge: boolean;
  betaUser: boolean;
  trialActive: boolean;
  activeDriver: boolean;
  blocked: boolean;
  testMode: boolean;
  coAdmin: boolean;
  permTeslaView: boolean;
  permEmergencyAdmin: boolean;
  permCivilModeration: boolean;
  permUserModeration: boolean;
}

export function editorFormToProfileUpdate(
  form: AdminUserEditorSavePayload,
  previous: Pick<Profile, "verification_status">
): Record<string, unknown> {
  let membershipType: Profile["membership_type"] = "inactive";
  let membershipExpiresAt: string | null = null;

  switch (form.membershipPlan) {
    case "premium_yearly": {
      membershipType = "annual_member";
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      membershipExpiresAt = expires.toISOString();
      break;
    }
    case "premium_monthly":
    case "founder":
    case "beta_user":
      membershipType = "active_driver";
      break;
    case "free_trial":
    default:
      membershipType = "inactive";
      break;
  }

  if (form.activeDriver || form.betaUser) {
    membershipType = "active_driver";
  }

  if (form.membershipPlan === "premium_yearly" && !form.activeDriver) {
    membershipType = "annual_member";
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 1);
    membershipExpiresAt = expires.toISOString();
  }

  if (
    form.membershipPlan === "free_trial" &&
    !form.activeDriver &&
    !form.betaUser
  ) {
    membershipType = "inactive";
    membershipExpiresAt = null;
  }

  let verificationStatus = previous.verification_status;
  if (form.blocked) {
    verificationStatus = "rejected";
  } else if (previous.verification_status === "rejected") {
    verificationStatus = "pending_verification";
  }

  return {
    nickname: form.nickname.trim() || null,
    display_name: joinDisplayName(form.firstName, form.lastName) || null,
    phone_number: form.phoneNumber.trim() || null,
    membership_type: membershipType,
    membership_expires_at: membershipExpiresAt,
    founder_badge: form.founderBadge || form.membershipPlan === "founder",
    beta_user: form.betaUser || form.membershipPlan === "beta_user",
    trial_active: form.trialActive,
    test_mode_enabled: form.testMode,
    is_co_admin: form.coAdmin,
    tesla_view_enabled: form.permTeslaView,
    co_admin_emergency_call: form.coAdmin && form.permEmergencyAdmin,
    co_admin_civil_moderation: form.coAdmin && form.permCivilModeration,
    co_admin_user_moderation: form.coAdmin && form.permUserModeration,
    verification_status: verificationStatus,
    updated_at: new Date().toISOString(),
  };
}

export interface AdminUserStatusBadge {
  emoji: string;
  label: string;
  className: string;
}

export function adminUserStatusBadges(
  profile: Pick<
    Profile,
    | "verification_status"
    | "test_mode_enabled"
    | "beta_user"
    | "tesla_beta"
    | "membership_type"
    | "founder_badge"
    | "is_co_admin"
  >
): AdminUserStatusBadge[] {
  const badges: AdminUserStatusBadge[] = [];

  if (profile.verification_status === "rejected") {
    badges.push({
      emoji: "🔴",
      label: "Blocked",
      className: "border-red-500/40 bg-red-500/15 text-red-300",
    });
  } else if (profile.verification_status === "verified") {
    badges.push({
      emoji: "🟢",
      label: "Active",
      className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    });
  }

  if (profile.test_mode_enabled) {
    badges.push({
      emoji: "🟡",
      label: "Testläge",
      className: "border-amber-500/40 bg-amber-500/15 text-amber-200",
    });
  } else if (profile.tesla_beta || profile.membership_type === "tesla_beta") {
    badges.push({
      emoji: "🟢",
      label: "Live",
      className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    });
  }

  if (profile.tesla_beta || profile.membership_type === "tesla_beta") {
    badges.push({
      emoji: "🚕",
      label: "Tesla Beta",
      className: "border-cyan-500/40 bg-cyan-500/15 text-cyan-200",
    });
  }

  if (profile.beta_user && !profile.tesla_beta && profile.membership_type !== "tesla_beta") {
    badges.push({
      emoji: "🔵",
      label: "Beta",
      className: "border-sky-500/40 bg-sky-500/15 text-sky-200",
    });
  }

  if (profile.founder_badge) {
    badges.push({
      emoji: "🟣",
      label: "Founder",
      className: "border-violet-500/40 bg-violet-500/15 text-violet-200",
    });
  }

  if (profile.is_co_admin) {
    badges.push({
      emoji: "🛡",
      label: "Co-Admin",
      className: "border-indigo-500/40 bg-indigo-500/15 text-indigo-200",
    });
  }

  return badges;
}
