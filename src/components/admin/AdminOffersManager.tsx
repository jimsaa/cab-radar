"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  isOfferVisibleToDrivers,
  offerGoogleMapsUrl,
  OFFER_BANNER_ACCEPT,
  OFFER_BANNER_RECOMMENDED,
} from "@/lib/offers";
import type { DriverOfferAdmin } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { Eye, Pencil, Trash2 } from "lucide-react";

interface OfferFormState {
  business_name: string;
  offer_title: string;
  address: string;
  google_maps_url: string;
  latitude: string;
  longitude: string;
  start_date: string;
  valid_until: string;
  redemption_text: string;
  admin_notes: string;
  is_active: boolean;
  banner_a_file: File | null;
  banner_b_file: File | null;
}

const emptyForm = (): OfferFormState => ({
  business_name: "",
  offer_title: "",
  address: "",
  google_maps_url: "",
  latitude: "",
  longitude: "",
  start_date: "",
  valid_until: "",
  redemption_text: "",
  admin_notes: "",
  is_active: true,
  banner_a_file: null,
  banner_b_file: null,
});

interface AdminOffersManagerProps {
  offers: DriverOfferAdmin[];
  canDelete: boolean;
}

export function AdminOffersManager({ offers, canDelete }: AdminOffersManagerProps) {
  const router = useRouter();
  const [form, setForm] = useState<OfferFormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [previewOffer, setPreviewOffer] = useState<DriverOfferAdmin | null>(null);
  const [previewRevealed, setPreviewRevealed] = useState(false);

  const editingOffer = useMemo(
    () => offers.find((o) => o.id === editingId) ?? null,
    [offers, editingId]
  );

  async function uploadBanner(
    offerId: string,
    slot: "banner-a" | "banner-b",
    file: File
  ) {
    const body = new FormData();
    body.append("offerId", offerId);
    body.append("slot", slot);
    body.append("file", file);

    const res = await fetch("/api/admin/offers/upload", {
      method: "POST",
      body,
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? "Uppladdning misslyckades.");
    }
  }

  async function saveOffer(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);

    try {
      const payload = {
        business_name: form.business_name,
        offer_title: form.offer_title,
        address: form.address,
        google_maps_url: form.google_maps_url || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        start_date: form.start_date || null,
        valid_until: form.valid_until || null,
        redemption_text: form.redemption_text,
        admin_notes: form.admin_notes,
        is_active: form.is_active,
      };

      let offerId = editingId;

      if (editingId) {
        const res = await fetch("/api/admin/offers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...payload }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error ?? "Kunde inte spara.");
      } else {
        const res = await fetch("/api/admin/offers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error ?? "Kunde inte skapa.");
        offerId = data.id as string;
      }

      if (!offerId) throw new Error("Erbjudande-ID saknas.");

      if (form.banner_a_file) {
        await uploadBanner(offerId, "banner-a", form.banner_a_file);
      }
      if (form.banner_b_file) {
        await uploadBanner(offerId, "banner-b", form.banner_b_file);
      }

      setForm(emptyForm());
      setEditingId(null);
      setFeedback(editingId ? "Erbjudande uppdaterat." : "Erbjudande skapat.");
      router.refresh();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Något gick fel.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(offer: DriverOfferAdmin) {
    setEditingId(offer.id);
    setForm({
      business_name: offer.business_name,
      offer_title: offer.offer_title,
      address: offer.address,
      google_maps_url: offer.google_maps_url ?? "",
      latitude: offer.latitude != null ? String(offer.latitude) : "",
      longitude: offer.longitude != null ? String(offer.longitude) : "",
      start_date: offer.start_date ?? "",
      valid_until: offer.valid_until ?? "",
      redemption_text: offer.redemption_text,
      admin_notes: offer.admin_notes,
      is_active: offer.is_active,
      banner_a_file: null,
      banner_b_file: null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleActive(offer: DriverOfferAdmin) {
    setBusy(true);
    const res = await fetch("/api/admin/offers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: offer.id, is_active: !offer.is_active }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  async function deleteOffer(offer: DriverOfferAdmin) {
    if (!canDelete) return;
    if (!window.confirm(`Radera "${offer.offer_title}"?`)) return;

    setBusy(true);
    const res = await fetch("/api/admin/offers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: offer.id }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  function statusLabel(offer: DriverOfferAdmin): string {
    if (!offer.is_active) return "Inaktiv";
    if (isOfferVisibleToDrivers(offer)) return "Aktiv";
    return "Schemalagd / utgången";
  }

  return (
    <div className="space-y-6">
      {feedback && (
        <p className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-sm">
          {feedback}
        </p>
      )}

      <form
        onSubmit={saveOffer}
        className="space-y-3 rounded-2xl border border-card-border bg-card p-4"
      >
        <h3 className="font-semibold">
          {editingId ? "Redigera erbjudande" : "Nytt erbjudande"}
        </h3>

        <input
          className="field"
          placeholder="Partnernamn (t.ex. Kund Café)"
          value={form.business_name}
          onChange={(e) => setForm({ ...form, business_name: e.target.value })}
          required
        />
        <input
          className="field"
          placeholder="Titel (t.ex. Café Skåne — 20% rabatt)"
          value={form.offer_title}
          onChange={(e) => setForm({ ...form, offer_title: e.target.value })}
          required
        />

        <input
          className="field"
          placeholder="Adress (valfritt, t.ex. Storgatan 1, Malmö)"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <input
          className="field"
          placeholder="Google Maps-länk (valfritt)"
          value={form.google_maps_url}
          onChange={(e) => setForm({ ...form, google_maps_url: e.target.value })}
          inputMode="url"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            className="field"
            placeholder="Latitud (valfritt)"
            value={form.latitude}
            onChange={(e) => setForm({ ...form, latitude: e.target.value })}
            inputMode="decimal"
          />
          <input
            className="field"
            placeholder="Longitud (valfritt)"
            value={form.longitude}
            onChange={(e) => setForm({ ...form, longitude: e.target.value })}
            inputMode="decimal"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted">
            Startdatum (valfritt)
            <input
              type="date"
              className="field mt-1"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </label>
          <label className="text-xs text-muted">
            Slutdatum (valfritt)
            <input
              type="date"
              className="field mt-1"
              value={form.valid_until}
              onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
            />
          </label>
        </div>

        <label className="block text-xs text-muted">
          Banner 1A — teaser (rekommenderat {OFFER_BANNER_RECOMMENDED})
          <input
            type="file"
            accept={OFFER_BANNER_ACCEPT}
            className="mt-1 w-full text-sm"
            onChange={(e) =>
              setForm({ ...form, banner_a_file: e.target.files?.[0] ?? null })
            }
          />
          {editingOffer?.banner_a_url && !form.banner_a_file && (
            <span className="mt-1 block text-[10px] text-success">✓ Banner A uppladdad</span>
          )}
        </label>

        <label className="block text-xs text-muted">
          Banner 1B — avslöja (rekommenderat {OFFER_BANNER_RECOMMENDED})
          <input
            type="file"
            accept={OFFER_BANNER_ACCEPT}
            className="mt-1 w-full text-sm"
            onChange={(e) =>
              setForm({ ...form, banner_b_file: e.target.files?.[0] ?? null })
            }
          />
          {editingOffer?.banner_b_url && !form.banner_b_file && (
            <span className="mt-1 block text-[10px] text-success">✓ Banner B uppladdad</span>
          )}
        </label>

        <textarea
          className="field"
          placeholder="Inlösen för förare (kod, fras eller instruktioner)"
          value={form.redemption_text}
          onChange={(e) => setForm({ ...form, redemption_text: e.target.value })}
          rows={2}
        />

        <textarea
          className="field"
          placeholder="Admin-anteckningar (syns aldrig för förare)"
          value={form.admin_notes}
          onChange={(e) => setForm({ ...form, admin_notes: e.target.value })}
          rows={3}
        />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="h-4 w-4 accent-accent"
          />
          Aktivt erbjudande
        </label>

        <div className="flex gap-2">
          <button type="submit" disabled={busy} className="btn-primary flex-1">
            {busy ? "Sparar…" : editingId ? "Spara ändringar" : "Skapa erbjudande"}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm());
              }}
            >
              Avbryt
            </button>
          )}
        </div>
      </form>

      <ul className="space-y-3">
        {offers.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-card-border p-8 text-center text-muted">
            Inga erbjudanden ännu.
          </li>
        ) : (
          offers.map((offer) => (
            <li
              key={offer.id}
              className="rounded-2xl border border-card-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    {offer.business_name}
                  </p>
                  <p className="font-semibold">{offer.offer_title}</p>
                  <p
                    className={cn(
                      "mt-1 text-xs font-medium",
                      offer.is_active && isOfferVisibleToDrivers(offer)
                        ? "text-success"
                        : "text-muted"
                    )}
                  >
                    {statusLabel(offer)}
                  </p>
                  {(offer.start_date || offer.valid_until) && (
                    <p className="mt-1 text-xs text-muted">
                      {offer.start_date && `Från ${offer.start_date}`}
                      {offer.start_date && offer.valid_until && " · "}
                      {offer.valid_until && `Till ${offer.valid_until}`}
                    </p>
                  )}
                </div>
              </div>

              {offer.admin_notes && (
                <p className="mt-2 rounded-lg bg-background/50 p-2 text-xs text-muted italic">
                  {offer.admin_notes}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setPreviewOffer(offer);
                    setPreviewRevealed(false);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-card-border px-2 py-1 text-xs font-medium"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Förhandsgranska
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startEdit(offer)}
                  className="inline-flex items-center gap-1 rounded-lg bg-accent/15 px-2 py-1 text-xs font-medium text-accent-bright"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Redigera
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => toggleActive(offer)}
                  className="rounded-lg border border-card-border px-2 py-1 text-xs font-medium"
                >
                  {offer.is_active ? "Inaktivera" : "Aktivera"}
                </button>
                {canDelete && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => deleteOffer(offer)}
                    className="inline-flex items-center gap-1 rounded-lg bg-danger/15 px-2 py-1 text-xs font-medium text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Radera
                  </button>
                )}
              </div>
            </li>
          ))
        )}
      </ul>

      {previewOffer && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 safe-bottom"
          role="dialog"
          aria-modal
        >
          <div className="w-full max-w-lg rounded-2xl border border-card-border bg-card p-4">
            <p className="mb-3 text-sm font-semibold">Förhandsgranska (förare)</p>
            <OfferPreview
              bannerA={previewOffer.banner_a_url}
              bannerB={previewOffer.banner_b_url}
              redemptionText={previewOffer.redemption_text}
              businessName={previewOffer.business_name}
              mapsUrl={offerGoogleMapsUrl(previewOffer)}
              revealed={previewRevealed}
              onReveal={() => setPreviewRevealed(true)}
            />
            <button
              type="button"
              className="btn-secondary mt-4 w-full"
              onClick={() => {
                setPreviewOffer(null);
                setPreviewRevealed(false);
              }}
            >
              Stäng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OfferPreview({
  bannerA,
  bannerB,
  redemptionText,
  businessName,
  mapsUrl,
  revealed,
  onReveal,
}: {
  bannerA: string | null;
  bannerB: string | null;
  redemptionText: string;
  businessName: string;
  mapsUrl: string | null;
  revealed: boolean;
  onReveal: () => void;
}) {
  if (!revealed) {
    return (
      <button type="button" onClick={onReveal} className="block w-full overflow-hidden rounded-xl">
        {bannerA ? (
          <div className="relative aspect-[320/100] w-full">
            <Image
              src={bannerA}
              alt="Banner 1A"
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-center text-muted">
            Banner 1A saknas
          </div>
        )}
        <p className="mt-2 text-center text-xs text-muted">Tryck för att avslöja</p>
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {bannerB ? (
        <div className="relative aspect-[320/100] w-full overflow-hidden rounded-xl">
          <Image src={bannerB} alt="Banner 1B" fill className="object-cover" unoptimized />
        </div>
      ) : null}
      {redemptionText && (
        <p className="rounded-xl border border-accent/30 bg-accent/10 p-4 text-center text-base font-semibold">
          {redemptionText}
        </p>
      )}
      {businessName && (
        <p className="text-center text-sm font-medium">{businessName}</p>
      )}
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary flex w-full items-center justify-center gap-2 !min-h-[48px]"
        >
          📍 Öppna i Google Maps
        </a>
      )}
    </div>
  );
}

export { OfferPreview };
