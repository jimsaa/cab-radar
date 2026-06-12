import Image from "next/image";
import { MapPin } from "lucide-react";
import type { TaxiDeal } from "@/lib/types/database";

export function DealCard({ deal }: { deal: TaxiDeal }) {
  return (
    <article className="rounded-2xl border border-card-border bg-card overflow-hidden">
      {deal.image_url && (
        <div className="relative aspect-[2/1] w-full">
          <Image
            src={deal.image_url}
            alt={deal.business_name}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      <div className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {deal.business_name}
        </p>
        <h2 className="mt-1 text-lg font-bold leading-snug">{deal.offer_title}</h2>

        {deal.offer_description && (
          <p className="mt-2 text-sm text-muted leading-relaxed">
            {deal.offer_description}
          </p>
        )}

        {deal.address && (
          <p className="mt-2 flex items-center gap-1 text-sm text-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {deal.address}
          </p>
        )}

        <p className="mt-3 text-xs text-muted">
          Giltig till {new Date(deal.valid_until).toLocaleDateString("sv-SE")}
        </p>

        <div className="mt-4 rounded-xl border border-dashed border-accent/40 bg-accent/5 p-3 text-center">
          <p className="text-sm font-semibold text-accent">
            Visa denna skärm vid inlösen
          </p>
        </div>
      </div>
    </article>
  );
}
