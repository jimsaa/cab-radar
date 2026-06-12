"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { BrandHeader } from "@/components/branding/BrandHeader";
import { clearSignupSuccess } from "@/lib/signup-success";
import { ONBOARDING_PENDING_MESSAGE } from "@/lib/verification";

const REDIRECT_SECONDS = 8;

interface SignupSuccessScreenProps {
  cabradarUserId: string | null;
  needsEmailConfirm: boolean;
}

export function SignupSuccessScreen({
  cabradarUserId,
  needsEmailConfirm,
}: SignupSuccessScreenProps) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) {
      clearSignupSuccess();
      router.replace("/login");
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, router]);

  function goToLogin() {
    clearSignupSuccess();
    router.replace("/login");
  }

  const infoText = needsEmailConfirm
    ? "Kontrollera din e-post och bekräfta ditt konto innan du loggar in."
    : ONBOARDING_PENDING_MESSAGE;

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 py-8">
      <BrandHeader logoSize={64} className="mb-6" />

      <div className="rounded-2xl border border-success/40 bg-gradient-to-b from-success/10 via-card to-card p-6 text-center shadow-lg shadow-success/10">
        <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-success/20 ring-4 ring-success/10">
          <CheckCircle2 className="h-10 w-10 text-success" strokeWidth={2.5} />
        </div>

        <h1 className="text-xl font-bold tracking-tight">🚕 Förarkonto skapat!</h1>

        <p className="mt-2 text-sm leading-relaxed text-muted">
          Ditt konto har skapats och väntar på godkännande.
        </p>

        <div className="mt-5 rounded-xl border border-card-border bg-background/90 px-4 py-4 text-left">
          <p className="text-center text-sm font-semibold text-accent-bright">
            ⏳ Väntar godkännande
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">{infoText}</p>
        </div>

        {cabradarUserId ? (
          <p className="mt-4 text-sm">
            Ditt användar-ID:{" "}
            <span className="font-mono text-base font-bold text-accent-bright">
              {cabradarUserId}
            </span>
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted">
            Ditt användar-ID visas i Inställningar efter inloggning.
          </p>
        )}

        <p className="mt-3 text-xs leading-relaxed text-muted">
          Spara ditt användar-ID om du behöver kontakta administratören.
        </p>

        <button
          type="button"
          onClick={goToLogin}
          className="btn-primary mt-6 w-full"
        >
          Till inloggning
        </button>

        <p className="mt-4 text-xs text-muted">
          Du skickas vidare till inloggning om {secondsLeft} sekunder…
        </p>
      </div>
    </div>
  );
}
