"use client";

import { useState } from "react";
import { PartnerModal } from "@/components/communication/PartnerModal";

/** Permanent advertiser CTA — replaces old promotional banner ads on the driver home. */
export function AdvertiserBanner() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="px-4 py-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mx-auto flex w-full max-w-lg flex-col items-start gap-1 rounded-2xl border border-sky-400/35 bg-gradient-to-r from-sky-500/20 via-card to-card px-4 py-3.5 text-left transition hover:border-sky-400/55 active:scale-[0.99]"
        >
          <span className="text-sm font-bold text-foreground">
            Vill du synas här?
          </span>
          <span className="text-xs leading-relaxed text-muted">
            Nå tusentals taxiförare varje vecka genom CabRadar.
          </span>
          <span className="mt-1 text-xs font-semibold text-accent-bright">
            Kontakta oss →
          </span>
        </button>
      </div>
      <PartnerModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
