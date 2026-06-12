"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface WelcomeActivationBannerProps {
  userId: string;
}

/** Shown once after admin activates a driver account. */
export function WelcomeActivationBanner({ userId }: WelcomeActivationBannerProps) {
  const [visible, setVisible] = useState(true);
  const [dismissing, setDismissing] = useState(false);

  if (!visible) return null;

  async function dismiss() {
    setDismissing(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({
        welcome_pending: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    setVisible(false);
    setDismissing(false);
  }

  return (
    <div className="mx-4 mt-3 rounded-2xl border border-success/40 bg-gradient-to-r from-success/15 to-success/5 p-4">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-success">Välkommen till CabRadar.</p>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            Ditt konto är nu aktivt. Du ser rapporter från din stad och kan
            bidra till nätverket.
          </p>
        </div>
        <button
          type="button"
          disabled={dismissing}
          onClick={() => void dismiss()}
          className="shrink-0 rounded-lg p-1 text-muted transition hover:bg-card hover:text-foreground"
          aria-label="Stäng"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
