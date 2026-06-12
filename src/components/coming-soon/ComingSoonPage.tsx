"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { APP_NAME, APP_SLOGAN } from "@/lib/constants";

function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "Kunde inte spara e-postadressen.");
        return;
      }

      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
      setError("Nätverksfel. Försök igen.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-success/30 bg-success/5 px-5 py-6 text-center">
        <p className="text-lg font-bold text-success">Tack!</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground/90">
          Vi meddelar dig när CabRadar öppnar för fler förare.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
      <p className="text-sm font-medium text-foreground">
        Vill du veta när vi öppnar?
      </p>
      <label htmlFor="waitlist-email" className="sr-only">
        E-postadress
      </label>
      <input
        id="waitlist-email"
        type="email"
        autoComplete="email"
        placeholder="E-postadress"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="field"
      />
      {error && <p className="text-sm text-muted">{error}</p>}
      <button
        type="submit"
        disabled={status === "loading"}
        className="btn-primary w-full !min-h-[48px] disabled:opacity-50"
      >
        {status === "loading" ? "Skickar…" : "Jag vill få besked"}
      </button>
    </form>
  );
}

export function ComingSoonPage({
  notInvited,
}: {
  notInvited?: boolean;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <div className="text-center">
          <Image
            src="/logo.png"
            alt={APP_NAME}
            width={88}
            height={88}
            className="mx-auto rounded-2xl"
            priority
          />
          <h1 className="mt-5 text-3xl font-black tracking-tight">
            🚖 {APP_NAME}
          </h1>
          <p className="mt-2 text-sm text-muted">{APP_SLOGAN}</p>
        </div>

        <div className="mt-10 space-y-4 text-center">
          <p className="text-xl font-semibold leading-snug text-foreground">
            Snart öppnar CabRadar.
          </p>
          <p className="text-sm leading-relaxed text-muted">
            Vi bygger ett tryggare och smartare verktyg för Sveriges taxiförare.
          </p>
        </div>

        {notInvited && (
          <p className="mt-6 rounded-xl border border-card-border bg-card/60 px-4 py-3 text-center text-sm text-muted">
            Ditt konto har inte beta-åtkomst ännu. CabRadar öppnar snart för
            fler förare.
          </p>
        )}

        <div className="mt-8 rounded-2xl border border-card-border bg-card p-5">
          <WaitlistForm />
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <Link
            href="/beta-login"
            className="btn-secondary w-full max-w-md !min-h-[48px] text-sm font-semibold"
          >
            Beta-inloggning
          </Link>
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-md pb-4 text-center text-xs text-muted">
        Av taxiförare. För taxiförare.
      </p>
    </div>
  );
}
