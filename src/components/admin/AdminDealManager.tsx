"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TaxiDeal } from "@/lib/types/database";
import { useRouter } from "next/navigation";

export function AdminDealManager({ deals }: { deals: TaxiDeal[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    business_name: "",
    offer_title: "",
    offer_description: "",
    address: "",
    valid_until: "",
    image_url: "",
    monthly_partner_fee: "0",
  });

  async function addDeal(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    await supabase.from("taxi_deals").insert({
      business_name: form.business_name,
      offer_title: form.offer_title,
      offer_description: form.offer_description,
      address: form.address,
      valid_until: form.valid_until,
      image_url: form.image_url || null,
      monthly_partner_fee: parseFloat(form.monthly_partner_fee) || 0,
      is_active: true,
    });
    setForm({
      business_name: "",
      offer_title: "",
      offer_description: "",
      address: "",
      valid_until: "",
      image_url: "",
      monthly_partner_fee: "0",
    });
    router.refresh();
  }

  async function toggleActive(deal: TaxiDeal) {
    const supabase = createClient();
    await supabase
      .from("taxi_deals")
      .update({ is_active: !deal.is_active })
      .eq("id", deal.id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={addDeal} className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
        <h3 className="font-semibold">Nytt erbjudande</h3>
        <input
          className="field"
          placeholder="Företagsnamn"
          value={form.business_name}
          onChange={(e) => setForm({ ...form, business_name: e.target.value })}
          required
        />
        <input
          className="field"
          placeholder="Rubrik"
          value={form.offer_title}
          onChange={(e) => setForm({ ...form, offer_title: e.target.value })}
          required
        />
        <textarea
          className="field"
          placeholder="Beskrivning"
          value={form.offer_description}
          onChange={(e) => setForm({ ...form, offer_description: e.target.value })}
          rows={2}
        />
        <input
          className="field"
          placeholder="Adress"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <input
          className="field"
          type="date"
          value={form.valid_until}
          onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
          required
        />
        <input
          className="field"
          placeholder="Bild-URL"
          value={form.image_url}
          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
        />
        <input
          className="field"
          type="number"
          step="0.01"
          placeholder="Månadsavgift (kr)"
          value={form.monthly_partner_fee}
          onChange={(e) => setForm({ ...form, monthly_partner_fee: e.target.value })}
        />
        <button type="submit" className="btn-primary w-full">
          Lägg till
        </button>
      </form>

      <ul className="space-y-3">
        {deals.map((deal) => (
          <li
            key={deal.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-card-border bg-card p-3"
          >
            <div>
              <p className="font-medium">{deal.business_name}</p>
              <p className="text-sm text-muted">{deal.offer_title}</p>
              <p className="text-xs text-muted">
                Avgift: {deal.monthly_partner_fee} kr/mån
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleActive(deal)}
              className={deal.is_active ? "btn-danger" : "btn-secondary !min-h-[36px] !py-2 text-sm"}
            >
              {deal.is_active ? "Stäng av" : "Aktivera"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
