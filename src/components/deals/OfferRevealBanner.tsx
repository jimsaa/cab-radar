"use client";

import Image from "next/image";
import { useState } from "react";
import type { DriverOffer } from "@/lib/types/database";

interface OfferRevealBannerProps {
  offer: DriverOffer;
}

/** Driver offer card — tap Banner 1A to reveal Banner 1B + redemption. */
export function OfferRevealBanner({ offer }: OfferRevealBannerProps) {
  const [open, setOpen] = useState(false);

  function handleTap() {
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleTap}
        className="block w-full overflow-hidden rounded-2xl border border-card-border bg-card text-left transition active:scale-[0.99] hover:border-accent/40"
        aria-label={`Erbjudande: ${offer.offer_title}`}
      >
        {offer.banner_a_url ? (
          <div className="relative aspect-[320/100] w-full bg-background/40">
            <Image
              src={offer.banner_a_url}
              alt={offer.offer_title}
              fill
              className="object-cover"
              sizes="(max-width: 512px) 100vw, 512px"
              unoptimized
            />
          </div>
        ) : (
          <div className="p-4">
            <p className="font-semibold">{offer.offer_title}</p>
          </div>
        )}
        <p className="px-3 py-2 text-center text-xs text-muted">
          Tryck för att se ditt exklusiva erbjudande →
        </p>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 safe-bottom"
          role="dialog"
          aria-modal
          aria-label="Erbjudandedetaljer"
        >
          <div className="w-full max-w-lg rounded-2xl border border-card-border bg-card p-4">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
              Exklusivt för CabRadar-förare
            </p>
            <p className="mb-4 font-semibold">{offer.offer_title}</p>

            {offer.banner_b_url ? (
              <div className="relative mb-4 aspect-[320/100] w-full overflow-hidden rounded-xl">
                <Image
                  src={offer.banner_b_url}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : null}

            {offer.redemption_text ? (
              <div className="rounded-xl border border-accent/40 bg-accent/10 px-4 py-5 text-center">
                <p className="text-lg font-bold leading-snug">{offer.redemption_text}</p>
              </div>
            ) : (
              <p className="text-center text-sm text-muted">
                Visa denna skärm vid inlösen.
              </p>
            )}

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-primary mt-4 w-full"
            >
              Stäng
            </button>
          </div>
        </div>
      )}
    </>
  );
}
