"use client";

import { Phone } from "lucide-react";
import Link from "next/link";
import { BrandHeader } from "@/components/branding/BrandHeader";
import { CommunicationHub } from "@/components/communication/CommunicationHub";
import { ONBOARDING_PENDING_MESSAGE } from "@/lib/verification";

/** Shown to logged-in drivers awaiting manual onboarding approval. */
export function PendingOnboardingScreen() {
  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 py-6">
      <BrandHeader logoSize={56} className="mb-6" />

      <div className="rounded-2xl border border-accent/40 bg-gradient-to-b from-accent/10 via-card to-card p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/20">
          <Phone className="h-7 w-7 text-accent-bright" />
        </div>

        <p className="text-xs font-bold uppercase tracking-widest text-accent-bright">
          Väntar godkännande
        </p>
        <h1 className="mt-2 text-xl font-bold">Ditt konto granskas</h1>

        <p className="mt-4 text-sm leading-relaxed text-muted">
          {ONBOARDING_PENDING_MESSAGE}
        </p>

        <div className="mt-5 rounded-xl border border-card-border bg-background/80 px-4 py-3 text-left text-sm text-muted">
          <p className="font-medium text-foreground">Medan du väntar</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs leading-relaxed">
            <li>Du kan logga in och se profilen</li>
            <li>LIVE och rapportering aktiveras efter godkännande</li>
            <li>CabRadar är ett slutet nätverk för verifierade förare</li>
          </ul>
        </div>

        <Link href="/settings" className="btn-secondary mt-6 inline-block w-full">
          Profil
        </Link>
      </div>

      <div className="mt-8 border-t border-card-border/60 pt-5">
        <CommunicationHub isLoggedIn />
      </div>
    </div>
  );
}
