"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { APP_NAME } from "@/lib/constants";

export default function BetaLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/beta-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Fel kod.");
        return;
      }

      router.push("/login");
      router.refresh();
    } catch {
      setError("Nätverksfel. Försök igen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
        <div className="text-center">
          <Image
            src="/logo.png"
            alt={APP_NAME}
            width={72}
            height={72}
            className="mx-auto rounded-2xl"
            priority
          />
          <h1 className="mt-4 text-xl font-bold">Beta-inloggning</h1>
          <p className="mt-2 text-sm text-muted">
            För inbjudna testförare och administratörer.
          </p>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="mt-8 rounded-2xl border border-card-border bg-card p-5"
        >
          <label htmlFor="beta-code" className="text-sm font-medium text-muted">
            Beta-kod
          </label>
          <input
            id="beta-code"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder="••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field mt-1.5 text-center text-lg tracking-widest"
          />
          {error && <p className="mt-2 text-sm text-muted">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="btn-primary mt-4 w-full !min-h-[48px] disabled:opacity-50"
          >
            {loading ? "Kontrollerar…" : "Fortsätt till inloggning"}
          </button>
        </form>

        <Link
          href="/coming-soon"
          className="mt-6 block text-center text-sm text-muted hover:text-foreground"
        >
          ← Tillbaka
        </Link>
      </div>
    </div>
  );
}
