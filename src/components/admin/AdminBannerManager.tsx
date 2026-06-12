"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BANNER_SLOTS, BANNER_SLOT_LABELS, type BannerSlot } from "@/lib/constants";
import type { BannerAd } from "@/lib/types/database";
import { useRouter } from "next/navigation";

export function AdminBannerManager({ banners }: { banners: BannerAd[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    slot: "dashboard_top" as BannerAd["slot"],
    title: "",
    image_url: "",
    link_url: "",
    sort_order: 0,
  });

  async function addBanner(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    await supabase.from("banner_ads").insert({
      slot: form.slot,
      title: form.title,
      image_url: form.image_url,
      link_url: form.link_url || null,
      sort_order: form.sort_order,
      is_active: true,
    });
    setForm({ slot: "dashboard_top", title: "", image_url: "", link_url: "", sort_order: 0 });
    router.refresh();
  }

  async function toggleActive(banner: BannerAd) {
    const supabase = createClient();
    await supabase
      .from("banner_ads")
      .update({ is_active: !banner.is_active })
      .eq("id", banner.id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={addBanner} className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
        <h3 className="font-semibold">Ny banner</h3>
        <select
          className="field"
          value={form.slot}
          onChange={(e) =>
            setForm({ ...form, slot: e.target.value as BannerAd["slot"] })
          }
        >
          {BANNER_SLOTS.map((slot) => (
            <option key={slot} value={slot}>
              {BANNER_SLOT_LABELS[slot]}
            </option>
          ))}
        </select>
        <input
          className="field"
          placeholder="Rubrik"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <input
          className="field"
          placeholder="Bild-URL"
          value={form.image_url}
          onChange={(e) => setForm({ ...form, image_url: e.target.value })}
          required
        />
        <input
          className="field"
          placeholder="Länk (valfritt)"
          value={form.link_url}
          onChange={(e) => setForm({ ...form, link_url: e.target.value })}
        />
        <button type="submit" className="btn-primary w-full">
          Lägg till
        </button>
      </form>

      <ul className="space-y-3">
        {banners.map((b) => (
          <li
            key={b.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-card-border bg-card p-3"
          >
            <div>
              <p className="font-medium">{BANNER_SLOT_LABELS[b.slot as BannerSlot]}</p>
              <p className="text-sm text-muted">{b.title || b.image_url}</p>
            </div>
            <button
              type="button"
              onClick={() => toggleActive(b)}
              className={b.is_active ? "btn-danger" : "btn-secondary !min-h-[36px] !py-2 text-sm"}
            >
              {b.is_active ? "Stäng av" : "Aktivera"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
