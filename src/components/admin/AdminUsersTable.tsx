"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  VERIFICATION_STATUS_LABELS,
  type DriverVerificationStatus,
} from "@/lib/verification";
import {
  MEMBERSHIP_TYPE_LABELS,
  formatMembershipExpiry,
  hasAnnualMembership,
  meetsContributionRequirements,
} from "@/lib/membership";
import { maskLicenceLast4 } from "@/lib/licence.shared";
import { formatDriverCityLabel } from "@/lib/driver-city";
import type { Profile } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type VerifyAction = "approve" | "reject" | "reset";

interface AdminUsersTableProps {
  users: Profile[];
  isAdmin: boolean;
}

export function AdminUsersTable({ users: initialUsers, isAdmin }: AdminUsersTableProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  useEffect(() => {
    console.log("[ADMIN] Is admin:", isAdmin);
  }, [isAdmin]);

  async function runVerification(
    userId: string,
    action: VerifyAction,
    logLabel: string
  ) {
    console.log("[ADMIN] Verification started");
    console.log("[ADMIN] Driver ID:", userId);
    console.log(`[ADMIN] ${logLabel}`);

    if (!isAdmin) {
      console.log("[ADMIN] Is admin: false");
      setFeedback({
        type: "error",
        message: "Du saknar behörighet att verifiera förare.",
      });
      return;
    }

    setBusyId(userId);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/verify-driver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: userId, action }),
      });

      const data: { ok?: boolean; message?: string; error?: string; verificationStatus?: DriverVerificationStatus } =
        await res.json();

      if (!res.ok || !data.ok) {
        const message =
          data.error ?? "Det gick inte att uppdatera föraren. Försök igen.";
        console.error("[ADMIN] Database update failed:", message);
        setFeedback({ type: "error", message });
        return;
      }

      console.log("[ADMIN] Database update success");

      if (data.verificationStatus) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, verification_status: data.verificationStatus! }
              : u
          )
        );
      }

      setFeedback({
        type: "success",
        message: data.message ?? "✅ Uppdaterat.",
      });
      router.refresh();
    } catch (err) {
      console.error("[ADMIN] Unexpected error:", err);
      setFeedback({
        type: "error",
        message: "Det gick inte att uppdatera föraren. Försök igen.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function setBetaUser(userId: string, betaUser: boolean) {
    if (!isAdmin) {
      setFeedback({
        type: "error",
        message: "Endast administratörer kan ändra beta-status.",
      });
      return;
    }

    setBusyId(userId);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/set-beta-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: userId, betaUser }),
      });

      const data: {
        ok?: boolean;
        message?: string;
        error?: string;
        betaUser?: boolean;
      } = await res.json();

      if (!res.ok || !data.ok) {
        setFeedback({
          type: "error",
          message: data.error ?? "Kunde inte uppdatera beta-status.",
        });
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                beta_user: Boolean(data.betaUser),
                membership_type:
                  data.betaUser ? "active_driver" : u.membership_type,
              }
            : u
        )
      );

      setFeedback({
        type: "success",
        message: data.message ?? "Beta-status uppdaterad.",
      });
      router.refresh();
    } catch (err) {
      console.error("[ADMIN] set-beta-user error:", err);
      setFeedback({
        type: "error",
        message: "Kunde inte uppdatera beta-status.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function setTestMode(userId: string, testModeEnabled: boolean) {
    if (!isAdmin) {
      setFeedback({
        type: "error",
        message: "Endast administratörer kan ändra testläge.",
      });
      return;
    }

    setBusyId(userId);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/set-test-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: userId, testModeEnabled }),
      });

      const data: {
        ok?: boolean;
        message?: string;
        error?: string;
        testModeEnabled?: boolean;
      } = await res.json();

      if (!res.ok || !data.ok) {
        setFeedback({
          type: "error",
          message: data.error ?? "Kunde inte uppdatera testläge.",
        });
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, test_mode_enabled: Boolean(data.testModeEnabled) }
            : u
        )
      );

      setFeedback({
        type: "success",
        message: data.message ?? "Testläge uppdaterat.",
      });
      router.refresh();
    } catch (err) {
      console.error("[ADMIN] set-test-mode error:", err);
      setFeedback({
        type: "error",
        message: "Kunde inte uppdatera testläge.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function setCoAdmin(userId: string, coAdmin: boolean) {
    if (!isAdmin) {
      setFeedback({
        type: "error",
        message: "Endast administratörer kan ändra Co-admin-status.",
      });
      return;
    }

    setBusyId(userId);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/set-co-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: userId, coAdmin }),
      });

      const data: {
        ok?: boolean;
        message?: string;
        error?: string;
        coAdmin?: boolean;
        coAdminEmergencyCall?: boolean;
        coAdminManageOffers?: boolean;
      } = await res.json();

      if (!res.ok || !data.ok) {
        setFeedback({
          type: "error",
          message: data.error ?? "Kunde inte uppdatera Co-admin-status.",
        });
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                is_co_admin: Boolean(data.coAdmin),
                co_admin_emergency_call: data.coAdmin
                  ? u.co_admin_emergency_call
                  : false,
                co_admin_manage_offers: data.coAdmin
                  ? u.co_admin_manage_offers
                  : false,
              }
            : u
        )
      );

      setFeedback({
        type: "success",
        message: data.message ?? "Co-admin-status uppdaterad.",
      });
      router.refresh();
    } catch (err) {
      console.error("[ADMIN] set-co-admin error:", err);
      setFeedback({
        type: "error",
        message: "Kunde inte uppdatera Co-admin-status.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function setCoAdminEmergencyCall(
    userId: string,
    emergencyCall: boolean
  ) {
    if (!isAdmin) {
      setFeedback({
        type: "error",
        message: "Endast administratörer kan ändra nödlägesbehörigheter.",
      });
      return;
    }

    setBusyId(userId);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/set-co-admin-emergency-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: userId, emergencyCall }),
      });

      const data: {
        ok?: boolean;
        message?: string;
        error?: string;
        coAdminEmergencyCall?: boolean;
      } = await res.json();

      if (!res.ok || !data.ok) {
        setFeedback({
          type: "error",
          message: data.error ?? "Kunde inte uppdatera behörigheten.",
        });
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                co_admin_emergency_call: Boolean(data.coAdminEmergencyCall),
              }
            : u
        )
      );

      setFeedback({
        type: "success",
        message: data.message ?? "Behörighet uppdaterad.",
      });
      router.refresh();
    } catch (err) {
      console.error("[ADMIN] set-co-admin-emergency-call error:", err);
      setFeedback({
        type: "error",
        message: "Kunde inte uppdatera behörigheten.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function setCoAdminManageOffers(
    userId: string,
    manageOffers: boolean
  ) {
    if (!isAdmin) {
      setFeedback({
        type: "error",
        message: "Endast administratörer kan ändra erbjudandebehörigheter.",
      });
      return;
    }

    setBusyId(userId);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/set-co-admin-manage-offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: userId, manageOffers }),
      });

      const data: {
        ok?: boolean;
        message?: string;
        error?: string;
        manageOffers?: boolean;
      } = await res.json();

      if (!res.ok || !data.ok) {
        setFeedback({
          type: "error",
          message: data.error ?? "Kunde inte uppdatera behörigheten.",
        });
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                co_admin_manage_offers: Boolean(data.manageOffers),
              }
            : u
        )
      );

      setFeedback({
        type: "success",
        message: data.message ?? "Behörighet uppdaterad.",
      });
      router.refresh();
    } catch (err) {
      console.error("[ADMIN] set-co-admin-manage-offers error:", err);
      setFeedback({
        type: "error",
        message: "Kunde inte uppdatera behörigheten.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function grantMembership(
    userId: string,
    action: "annual" | "active"
  ) {
    if (!isAdmin) {
      setFeedback({
        type: "error",
        message: "Du saknar behörighet.",
      });
      return;
    }

    setBusyId(userId);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/activate-membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: userId, action }),
      });

      const data: {
        ok?: boolean;
        message?: string;
        error?: string;
        membershipType?: Profile["membership_type"];
        membershipExpiresAt?: string | null;
      } = await res.json();

      if (!res.ok || !data.ok) {
        setFeedback({
          type: "error",
          message: data.error ?? "Det gick inte att uppdatera medlemskapet.",
        });
        return;
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                membership_type: data.membershipType ?? u.membership_type,
                membership_expires_at:
                  data.membershipExpiresAt ?? u.membership_expires_at,
              }
            : u
        )
      );

      setFeedback({
        type: "success",
        message: data.message ?? "✅ Medlemskap uppdaterat.",
      });
      router.refresh();
    } catch (err) {
      console.error("[ADMIN] Unexpected error:", err);
      setFeedback({
        type: "error",
        message: "Det gick inte att uppdatera medlemskapet.",
      });
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;

    return users.filter((u) => {
      const idMatch = u.cabradar_user_id?.toLowerCase().includes(q);
      const nameMatch = u.display_name?.toLowerCase().includes(q);
      const masked = maskLicenceLast4(u.driver_license_last4).toLowerCase();
      const last4Match = u.driver_license_last4?.includes(q.replace(/^xx/i, ""));
      const maskedMatch = masked.includes(q);
      return idMatch || nameMatch || last4Match || maskedMatch;
    });
  }, [users, query]);

  const pendingCount = users.filter(
    (u) => u.verification_status === "pending_verification" && !u.is_admin
  ).length;

  return (
    <div className="space-y-3">
      {!isAdmin && (
        <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          Du saknar behörighet att verifiera förare.
        </p>
      )}

      {feedback && (
        <p
          role="alert"
          className={cn(
            "rounded-xl px-3 py-2 text-sm",
            feedback.type === "success"
              ? "border border-success/30 bg-success/10 text-success"
              : "border border-danger/30 bg-danger/10 text-danger"
          )}
        >
          {feedback.message}
        </p>
      )}

      {pendingCount > 0 && (
        <p className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-sm">
          👤 {pendingCount} förare väntar godkännande
        </p>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          className="field pl-9"
          placeholder="Sök ID, namn eller XX1234…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Sök förare"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-card-border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-card text-left text-muted">
            <tr>
              <th className="p-3 font-medium">Användar-ID</th>
              <th className="p-3 font-medium">Förare</th>
              <th className="p-3 font-medium">Mobil</th>
              <th className="p-3 font-medium">Leg.</th>
              <th className="p-3 font-medium">Medlemskap</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Åtgärder</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted">
                  Inga träffar
                </td>
              </tr>
            ) : (
              filtered.map((u) => {
                const isBusy = busyId === u.id;
                return (
                  <tr key={u.id} className="border-t border-card-border">
                    <td className="p-3 font-mono text-xs font-semibold text-accent-bright">
                      {u.cabradar_user_id ?? "—"}
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{u.display_name ?? "—"}</p>
                      {u.verification_status === "pending_verification" &&
                        !u.is_admin && (
                          <p className="mt-1 text-xs text-muted">
                            {formatDriverCityLabel(u.driver_city)}
                            {u.taxi_company_name
                              ? ` · ${u.taxi_company_name}`
                              : ""}
                            {u.taxi_number ? ` · Taxi ${u.taxi_number}` : ""}
                          </p>
                        )}
                      {!u.is_admin && isAdmin && (
                        <div className="mt-2 space-y-2">
                          <div className="rounded-lg border border-card-border/80 bg-background/40 p-2">
                            <label className="flex cursor-pointer items-start gap-2">
                              <input
                                type="checkbox"
                                checked={u.is_co_admin}
                                disabled={isBusy}
                                onChange={(e) =>
                                  void setCoAdmin(u.id, e.target.checked)
                                }
                                className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                              />
                              <span className="text-xs leading-snug">
                                <span className="font-medium">Co-admin</span>
                                <span className="mt-0.5 block text-[10px] text-muted">
                                  Åtkomst till Taxi i nöd-administration.
                                </span>
                              </span>
                            </label>
                          </div>
                          {u.is_co_admin && (
                            <div className="rounded-lg border border-card-border/80 bg-background/40 p-2">
                              <label className="flex cursor-pointer items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={u.co_admin_emergency_call}
                                  disabled={isBusy}
                                  onChange={(e) =>
                                    void setCoAdminEmergencyCall(
                                      u.id,
                                      e.target.checked
                                    )
                                  }
                                  className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                                />
                                <span className="text-xs leading-snug">
                                  <span className="font-medium">
                                    Ring förare vid nödläge
                                  </span>
                                  <span className="mt-0.5 block text-[10px] text-muted">
                                    Får se mobilnummer och ringa vid aktiva
                                    Taxi i nöd-larm.
                                  </span>
                                </span>
                              </label>
                            </div>
                          )}
                          {u.is_co_admin && (
                            <div className="rounded-lg border border-card-border/80 bg-background/40 p-2">
                              <label className="flex cursor-pointer items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={u.co_admin_manage_offers}
                                  disabled={isBusy}
                                  onChange={(e) =>
                                    void setCoAdminManageOffers(
                                      u.id,
                                      e.target.checked
                                    )
                                  }
                                  className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                                />
                                <span className="text-xs leading-snug">
                                  <span className="font-medium">
                                    Hantera erbjudanden
                                  </span>
                                  <span className="mt-0.5 block text-[10px] text-muted">
                                    Får skapa, redigera och ladda upp banners
                                    för förarerbjudanden.
                                  </span>
                                </span>
                              </label>
                            </div>
                          )}
                          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2">
                            <label className="flex cursor-pointer items-start gap-2">
                              <input
                                type="checkbox"
                                checked={u.test_mode_enabled}
                                disabled={isBusy}
                                onChange={(e) =>
                                  void setTestMode(u.id, e.target.checked)
                                }
                                className="mt-0.5 h-4 w-4 shrink-0 accent-amber-500"
                              />
                              <span className="text-xs leading-snug">
                                <span className="font-medium">Testläge</span>
                                <span className="mt-0.5 block text-[10px] text-muted">
                                  Föraren skickar endast testrapporter tills
                                  testläge stängs av.
                                </span>
                              </span>
                            </label>
                          </div>
                          <div className="rounded-lg border border-card-border/80 bg-background/40 p-2">
                            <label className="flex cursor-pointer items-start gap-2">
                              <input
                                type="checkbox"
                                checked={u.beta_user}
                                disabled={isBusy}
                                onChange={(e) =>
                                  void setBetaUser(u.id, e.target.checked)
                                }
                                className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                              />
                              <span className="text-xs leading-snug">
                                <span className="font-medium">Beta-användare</span>
                                {u.beta_user && (
                                  <>
                                    <span className="mt-1 block text-foreground/90">
                                      🧪 Beta-användare
                                    </span>
                                    <span className="mt-0.5 block text-[10px] text-muted">
                                      Denna användare har tillfällig full åtkomst
                                      under betaperioden.
                                    </span>
                                  </>
                                )}
                              </span>
                            </label>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-muted">{u.phone_number ?? "—"}</td>
                    <td className="p-3 font-mono text-xs">
                      {maskLicenceLast4(u.driver_license_last4)}
                    </td>
                    <td className="p-3 text-xs">
                      <p>{MEMBERSHIP_TYPE_LABELS[u.membership_type]}</p>
                      {hasAnnualMembership(u) && u.membership_expires_at && (
                        <p className="text-muted">
                          t.o.m. {formatMembershipExpiry(u.membership_expires_at)}
                        </p>
                      )}
                      {!u.is_admin && u.membership_type !== "annual_member" && (
                        <>
                          <p className="mt-1 text-muted">
                            Rapporter: {u.monthly_reports_count} · Röster:{" "}
                            {u.monthly_votes_count} · Poäng: {u.monthly_points}
                          </p>
                          <p
                            className={cn(
                              "mt-0.5 font-medium",
                              meetsContributionRequirements(u) || u.beta_user
                                ? "text-success"
                                : "text-amber-400"
                            )}
                          >
                            {u.beta_user
                              ? "🧪 Betatest — full tillgång"
                              : meetsContributionRequirements(u)
                                ? "✓ Aktiv förare"
                                : "⚠ Inaktiv"}
                          </p>
                        </>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          u.verification_status === "verified"
                            ? "bg-success/15 text-success"
                            : u.verification_status === "pending_verification"
                              ? "bg-accent/15 text-accent-bright"
                              : "bg-danger/15 text-danger"
                        )}
                      >
                        {VERIFICATION_STATUS_LABELS[u.verification_status]}
                      </span>
                    </td>
                    <td className="p-3">
                      {!u.is_admin && (
                        <div className="flex flex-wrap gap-1">
                          {u.verification_status === "pending_verification" &&
                            u.phone_number && (
                              <a
                                href={`tel:${u.phone_number.replace(/\s/g, "")}`}
                                className="rounded-lg border border-card-border bg-card px-2 py-1 text-xs font-medium text-foreground"
                              >
                                📞 Ring upp
                              </a>
                            )}
                          {u.verification_status !== "verified" && (
                            <button
                              type="button"
                              disabled={!isAdmin || isBusy}
                              onClick={() =>
                                runVerification(u.id, "approve", "Approve clicked")
                              }
                              className="rounded-lg bg-success/15 px-2 py-1 text-xs font-medium text-success disabled:opacity-50"
                            >
                              ✅ Aktivera
                            </button>
                          )}
                          {u.verification_status !== "rejected" && (
                            <button
                              type="button"
                              disabled={!isAdmin || isBusy}
                              onClick={() =>
                                runVerification(u.id, "reject", "Reject clicked")
                              }
                              className="rounded-lg bg-danger/15 px-2 py-1 text-xs font-medium text-danger disabled:opacity-50"
                            >
                              ❌ Avvisa
                            </button>
                          )}
                          {u.verification_status !== "pending_verification" && (
                            <button
                              type="button"
                              disabled={!isAdmin || isBusy}
                              onClick={() =>
                                runVerification(u.id, "reset", "Reset clicked")
                              }
                              className="rounded-lg border border-card-border bg-card px-2 py-1 text-xs text-muted disabled:opacity-50"
                            >
                              Återställ
                            </button>
                          )}
                          {u.verification_status === "verified" &&
                            u.membership_type !== "active_driver" &&
                            !hasAnnualMembership(u) && (
                              <button
                                type="button"
                                disabled={!isAdmin || isBusy}
                                onClick={() => grantMembership(u.id, "active")}
                                className="rounded-lg bg-success/15 px-2 py-1 text-xs font-medium text-success disabled:opacity-50"
                              >
                                Aktivera medlem
                              </button>
                            )}
                          {u.verification_status === "verified" &&
                            !hasAnnualMembership(u) && (
                              <button
                                type="button"
                                disabled={!isAdmin || isBusy}
                                onClick={() => grantMembership(u.id, "annual")}
                                className="rounded-lg bg-accent/15 px-2 py-1 text-xs font-medium text-accent-bright disabled:opacity-50"
                              >
                                Ge årsmedlem
                              </button>
                            )}
                        </div>
                      )}
                      {u.is_admin && (
                        <span className="text-xs text-muted">Admin</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
