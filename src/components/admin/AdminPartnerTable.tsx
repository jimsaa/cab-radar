"use client";

import type { PartnerLead } from "@/lib/types/database";
import { formatSwedishDateTime } from "@/lib/datetime";
import { AdminStatusList, PARTNER_STATUS_LABELS } from "./AdminStatusList";

export function AdminPartnerTable({ leads }: { leads: PartnerLead[] }) {
  return (
    <AdminStatusList
      items={leads}
      table="partner_leads"
      searchPlaceholder="Sök företag, kontakt eller telefon…"
      emptyMessage="Inga partner leads."
      statusLabels={PARTNER_STATUS_LABELS}
      markContactedLabel="Mark as Contacted"
      markClosedLabel="Mark as Closed"
      searchFilter={(item, q) => {
        const upper = q.toUpperCase();
        return (
          item.company_name.toUpperCase().includes(upper) ||
          item.contact_person.toUpperCase().includes(upper) ||
          item.phone.includes(q) ||
          (item.email?.toUpperCase().includes(upper) ?? false)
        );
      }}
      renderHeader={(item) => (
        <>
          <p className="font-semibold leading-snug">{item.company_name}</p>
          <p className="mt-1 text-xs text-muted">
            {item.contact_person} · {item.phone}
            {item.email ? ` · ${item.email}` : ""}
          </p>
          <p className="mt-1 text-xs text-muted">
            {formatSwedishDateTime(item.created_at)}
          </p>
        </>
      )}
      renderBody={(item) => (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {item.offer_description}
        </p>
      )}
    />
  );
}
