"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isValidLicence,
  LICENCE_INVALID_MESSAGE,
  normalizeLicenceInput,
} from "@/lib/licence.shared";
import {
  saveSignupSuccess,
  signupSuccessSearchParams,
} from "@/lib/signup-success";
import Link from "next/link";
import { AlertCircle, Shield } from "lucide-react";
import { LICENCE_PRIVACY_MESSAGE } from "@/lib/verification";

interface AuthFormProps {
  mode: "login" | "signup";
}

const MSG_LOADING = "Bearbetar...";
const MSG_SIGNUP_SUCCESS = "Kontot har skapats.";
const MSG_SIGNUP_ERROR = "Det gick inte att skapa kontot.";
const MSG_LOGIN_ERROR = "Fel e-post eller lösenord.";
const MSG_UNEXPECTED = "Ett oväntat fel uppstod. Försök igen.";

function FeedbackCard({
  message,
  variant,
}: {
  message: string;
  variant: "error" | "success" | "config";
}) {
  const styles =
    variant === "success"
      ? "border-success/40 bg-success/10 text-success"
      : "border-danger/40 bg-danger/10 text-danger";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex gap-3 rounded-xl border px-4 py-3 ${styles}`}
    >
      {variant !== "success" && (
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      )}
      <p className="text-sm font-medium leading-relaxed">{message}</p>
    </div>
  );
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [driverLicenseNumber, setDriverLicenseNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/config")
      .then(async (res) => {
        if (res.ok) return;
        const data = await res.json().catch(() => ({}));
        setConfigError(data.error ?? "Supabase är felkonfigurerad.");
      })
      .catch(() => {
        setConfigError("Kunde inte kontrollera serverkonfiguration.");
      });
  }, []);

  async function handleSignupSubmit() {
    console.log("[AUTH] Signup started");
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (configError) {
      setError(configError);
      setLoading(false);
      return;
    }

    const licence = normalizeLicenceInput(driverLicenseNumber);
    if (!isValidLicence(licence)) {
      console.error("[AUTH] Signup failed: invalid licence");
      setError(LICENCE_INVALID_MESSAGE);
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Lösenorden matchar inte.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Lösenordet måste vara minst 6 tecken.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          displayName,
          phoneNumber,
          driverLicenseNumber: licence,
        }),
      });

      let data: {
        error?: string;
        message?: string;
        cabradarUserId?: string | null;
        needsEmailConfirm?: boolean;
      } = {};

      try {
        data = await res.json();
      } catch (parseErr) {
        console.error("[AUTH] Signup failed: invalid JSON response", parseErr);
        setError(MSG_UNEXPECTED);
        setLoading(false);
        return;
      }

      console.log("[AUTH] Supabase signup response:", { status: res.status, data });

      if (!res.ok) {
        const message = data.error ?? MSG_SIGNUP_ERROR;
        console.error("[AUTH] Signup failed:", message);
        setError(message);
        setLoading(false);
        return;
      }

      console.log("[AUTH] Profile creation success");
      console.log("[AUTH] Signup completed");

      const successMsg = data.message ?? MSG_SIGNUP_SUCCESS;
      setSuccess(successMsg);
      setLoading(false);

      const payload = {
        cabradarUserId: data.cabradarUserId ?? null,
        needsEmailConfirm: Boolean(data.needsEmailConfirm),
      };
      saveSignupSuccess(payload);

      window.setTimeout(() => {
        const query = signupSuccessSearchParams(payload);
        router.replace(query ? `/signup/klart?${query}` : "/signup/klart");
      }, 600);
    } catch (err) {
      console.error("[AUTH] Signup failed:", err);
      setError(MSG_UNEXPECTED);
      setLoading(false);
    }
  }

  async function handleLoginSubmit() {
    console.log("[AUTH] Login started");
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (configError) {
      setError(configError);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      let data: { error?: string; ok?: boolean } = {};
      try {
        data = await res.json();
      } catch {
        setError(MSG_UNEXPECTED);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const message = data.error ?? MSG_LOGIN_ERROR;
        console.error("[AUTH] Login failed:", message);
        setError(message);
        setLoading(false);
        return;
      }

      console.log("[AUTH] Login success");
      window.location.assign("/");
    } catch (err) {
      console.error("[AUTH] Login failed:", err);
      setError(MSG_UNEXPECTED);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    if (mode === "signup") {
      await handleSignupSubmit();
    } else {
      await handleLoginSubmit();
    }
  }

  const submitDisabled = loading || Boolean(configError);

  return (
    <form
      onSubmit={handleSubmit}
      method="post"
      action="/login"
      noValidate
      className="flex flex-col gap-4"
    >
      {configError && <FeedbackCard message={configError} variant="config" />}
      {success && <FeedbackCard message={success} variant="success" />}
      {error && <FeedbackCard message={error} variant="error" />}

      {mode === "signup" && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">Förarnamn</span>
            <input
              className="field"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ditt namn"
              required
              autoComplete="name"
              disabled={submitDisabled}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">Mobilnummer</span>
            <input
              className="field"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="070 123 45 67"
              required
              autoComplete="tel"
              disabled={submitDisabled}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">E-post</span>
            <input
              className="field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={submitDisabled}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">Taxiförarleg. nr</span>
            <input
              className="field"
              value={driverLicenseNumber}
              onChange={(e) => {
                setDriverLicenseNumber(e.target.value);
                if (error) setError(null);
              }}
              required
              autoComplete="off"
              disabled={submitDisabled}
            />
          </label>

          <div className="rounded-xl border border-card-border bg-card p-3">
            <div className="flex gap-2">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-accent-bright" />
              <p className="text-xs text-muted leading-relaxed">
                {LICENCE_PRIVACY_MESSAGE}
              </p>
            </div>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">Lösenord</span>
            <input
              className="field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              disabled={submitDisabled}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">Bekräfta lösenord</span>
            <input
              className="field"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              disabled={submitDisabled}
            />
          </label>
        </>
      )}

      {mode === "login" && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">E-post</span>
            <input
              className="field"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={submitDisabled}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">Lösenord</span>
            <input
              className="field"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="current-password"
              disabled={submitDisabled}
            />
          </label>
        </>
      )}

      <button type="submit" disabled={submitDisabled} className="btn-primary w-full">
        {loading
          ? MSG_LOADING
          : mode === "signup"
            ? "Skapa konto"
            : "Logga in"}
      </button>

      <p className="text-center text-sm text-muted">
        {mode === "signup" ? (
          <>
            Har du redan ett konto?{" "}
            <Link href="/login" className="text-accent font-medium">
              Logga in
            </Link>
          </>
        ) : (
          <>
            Ny förare?{" "}
            <Link href="/signup" className="text-accent font-medium">
              Skapa konto
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
