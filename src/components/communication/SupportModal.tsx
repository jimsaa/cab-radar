"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ModalActions,
  ModalShell,
  ModalSuccess,
  useAutoClose,
} from "@/components/ui/ModalShell";

const SUCCESS = "✅ Ditt meddelande har skickats till support.";

interface SupportProfilePreview {
  displayName: string | null;
  cabradarUserId: string;
  email: string | null;
  phoneNumber: string | null;
  driverCity: string | null;
}

interface SupportModalProps {
  open: boolean;
  onClose: () => void;
}

type ProfileLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; profile: SupportProfilePreview }
  | { status: "missing" }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

export function SupportModal({ open, onClose }: SupportModalProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [profileState, setProfileState] = useState<ProfileLoadState>({
    status: "idle",
  });

  const reset = useCallback(() => {
    setSubject("");
    setMessage("");
    setError(null);
    setSuccess(false);
    setLoading(false);
    setProfileState({ status: "idle" });
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  useAutoClose(handleClose, success);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setProfileState({ status: "loading" });
    setError(null);

    async function loadProfile() {
      try {
        const res = await fetch("/api/support");
        const data = (await res.json()) as {
          authenticated?: boolean;
          profileExists?: boolean;
          displayName?: string | null;
          cabradarUserId?: string;
          email?: string | null;
          phoneNumber?: string | null;
          driverCity?: string | null;
          error?: string;
        };

        if (cancelled) return;

        if (res.status === 401 || !data.authenticated) {
          setProfileState({ status: "unauthenticated" });
          return;
        }

        if (!data.profileExists) {
          if (process.env.NODE_ENV === "development") {
            console.warn("[SUPPORT UI] No profile record for authenticated user");
          }
          setProfileState({ status: "missing" });
          return;
        }

        setProfileState({
          status: "ready",
          profile: {
            displayName: data.displayName ?? null,
            cabradarUserId: data.cabradarUserId ?? "—",
            email: data.email ?? null,
            phoneNumber: data.phoneNumber ?? null,
            driverCity: data.driverCity ?? null,
          },
        });
      } catch (err) {
        if (cancelled) return;
        if (process.env.NODE_ENV === "development") {
          console.error("[SUPPORT UI] Profile load failed", err);
        }
        setProfileState({
          status: "error",
          message: "Kunde inte ladda profil. Försök igen.",
        });
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (profileState.status !== "ready") return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Det gick inte att skicka meddelandet.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Det gick inte att ansluta till servern.");
    } finally {
      setLoading(false);
    }
  }

  const profileReady = profileState.status === "ready";
  const profileLoading = profileState.status === "loading";
  const formDisabled = loading || !profileReady;

  return (
    <ModalShell open={open} onClose={handleClose} titleId="support-title">
      {success ? (
        <ModalSuccess message={SUCCESS} />
      ) : (
        <>
          <h2 id="support-title" className="text-lg font-bold">
            Support
          </h2>
          <p className="mt-1 text-sm text-muted">
            Behöver du hjälp? Skicka ett meddelande så återkommer vi så snart vi
            kan.
          </p>

          {profileLoading && (
            <p className="mt-4 rounded-lg border border-card-border bg-card/50 px-3 py-2 text-sm text-muted">
              Laddar profil…
            </p>
          )}

          {profileState.status === "unauthenticated" && (
            <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              Logga in för att kontakta support.
            </p>
          )}

          {profileState.status === "missing" && (
            <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              Profil saknas.
            </p>
          )}

          {profileState.status === "error" && (
            <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {profileState.message}
            </p>
          )}

          {profileReady && (
            <div className="mt-3 rounded-xl border border-card-border/80 bg-background/40 px-3 py-2 text-xs text-muted">
              <p className="font-medium text-foreground/80">Skickas som</p>
              <p className="mt-1">
                {profileState.profile.displayName ?? "Förare"}
                {profileState.profile.cabradarUserId
                  ? ` · ${profileState.profile.cabradarUserId}`
                  : ""}
              </p>
              {profileState.profile.email && (
                <p>{profileState.profile.email}</p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-muted">Ämne</span>
              <input
                className="field"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={120}
                disabled={formDisabled}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-muted">Meddelande</span>
              <textarea
                className="field min-h-[120px] resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                disabled={formDisabled}
              />
            </label>
            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            <ModalActions
              onCancel={handleClose}
              loading={loading}
              submitDisabled={formDisabled}
            />
          </form>
        </>
      )}
    </ModalShell>
  );
}
