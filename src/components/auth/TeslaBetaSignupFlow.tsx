"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import {
  isValidLicence,
  LICENCE_INVALID_MESSAGE,
  normalizeLicenceInput,
} from "@/lib/licence.shared";
import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_PRIVACY_EXPLANATION,
  validateNickname,
} from "@/lib/driver-nickname";
import { LICENCE_PRIVACY_MESSAGE } from "@/lib/verification";
import { recordDriverActivityFromDevice } from "@/lib/driver-activity-client";

const BENEFITS = [
  "LIVE-rapporter",
  "Taxi i nöd",
  "CivilKoll",
  "GSI Landvetter",
  "SJ Ankomster",
  "Tesla-anpassad vy",
] as const;

export function TeslaBetaSignupFlow() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [driverLicenseNumber, setDriverLicenseNumber] = useState("");
  const [taxiNumber, setTaxiNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (configError) {
      setError(configError);
      return;
    }

    const licence = normalizeLicenceInput(driverLicenseNumber);
    if (!isValidLicence(licence)) {
      setError(LICENCE_INVALID_MESSAGE);
      return;
    }

    if (password !== confirmPassword) {
      setError("Lösenorden matchar inte.");
      return;
    }

    if (password.length < 6) {
      setError("Lösenordet måste vara minst 6 tecken.");
      return;
    }

    const nicknameError = validateNickname(nickname);
    if (nicknameError) {
      setError(nicknameError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/tesla-beta-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          nickname,
          driverLicenseNumber: licence,
          taxiNumber: taxiNumber.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Det gick inte att skapa kontot.");
        setLoading(false);
        return;
      }

      void recordDriverActivityFromDevice("login");
      router.replace(data.redirect ?? "/tesla");
      router.refresh();
    } catch {
      setError("Ett oväntat fel uppstod. Försök igen.");
      setLoading(false);
    }
  }

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 py-8">
      <div className="mb-8 flex flex-col items-center text-center">
        <Image
          src="/logo.png"
          alt={APP_NAME}
          width={72}
          height={72}
          className="rounded-2xl"
          priority
        />
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          🚕⚡ Tesla Beta Göteborg
        </h1>
      </div>

      {!showForm ? (
        <div className="space-y-6">
          <p className="text-base leading-relaxed text-muted">
            Jag söker Tesla-förare som kör taxi i Göteborg och vill hjälpa till
            att testa CabRadar i verklig körning.
          </p>
          <p className="text-base leading-relaxed text-muted">
            CabRadar är byggt av en taxiförare, för taxiförare, och fungerar
            direkt i Teslans webbläsare.
          </p>

          <div className="rounded-2xl border border-card-border bg-card/60 p-5">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Det här får du
            </p>
            <ul className="space-y-2">
              {BENEFITS.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <span className="text-accent-bright">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn-primary w-full py-4 text-lg font-semibold"
          >
            Gå med i Tesla Beta
          </button>

          <p className="text-center text-sm text-muted">
            Har du redan konto?{" "}
            <Link href="/login" className="text-accent-bright underline">
              Logga in
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="text-sm text-muted underline"
          >
            ← Tillbaka
          </button>

          {error && (
            <div
              role="alert"
              className="flex gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-danger"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <label className="block">
            <span className="field-label">E-post</span>
            <input
              type="email"
              required
              autoComplete="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="field-label">Lösenord</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="field-label">Bekräfta lösenord</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              minLength={6}
              className="field"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="field-label">Smeknamn (syns för andra förare)</span>
            <input
              type="text"
              required
              maxLength={NICKNAME_MAX_LENGTH}
              className="field"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
            <span className="mt-1 block text-xs text-muted">
              {NICKNAME_PRIVACY_EXPLANATION}
            </span>
          </label>

          <label className="block">
            <span className="field-label">TaxiLeg</span>
            <input
              type="text"
              required
              inputMode="text"
              autoComplete="off"
              className="field font-mono uppercase"
              placeholder="AB12345"
              value={driverLicenseNumber}
              onChange={(e) => setDriverLicenseNumber(e.target.value.toUpperCase())}
            />
            <span className="mt-1 block text-xs text-muted">
              {LICENCE_PRIVACY_MESSAGE}
            </span>
          </label>

          <label className="block">
            <span className="field-label">Taxinummer (valfritt)</span>
            <input
              type="text"
              className="field"
              value={taxiNumber}
              onChange={(e) => setTaxiNumber(e.target.value)}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 text-lg font-semibold disabled:opacity-60"
          >
            {loading ? "Skapar konto…" : "Gå med i Tesla Beta"}
          </button>
        </form>
      )}
    </div>
  );
}
