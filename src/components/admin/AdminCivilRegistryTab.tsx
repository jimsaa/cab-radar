"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  civilSourceLabel,
  formatCivilDateTime,
  formatCivilkollObservedDate,
  normalizeRegistrationNumber,
  type CivilRegistryWithApprover,
} from "@/lib/civilkoll";
import { cn } from "@/lib/utils";
import { Plus, X } from "lucide-react";

export function AdminCivilRegistryTab({
  registry,
}: {
  registry: CivilRegistryWithApprover[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [registration, setRegistration] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = normalizeRegistrationNumber(search);
    if (!q) return registry;
    return registry.filter((entry) =>
      entry.registration_number.includes(q)
    );
  }, [registry, search]);

  async function handleImport() {
    if (!importText.trim()) {
      setError("Klistra in registreringsnummer — en per rad.");
      return;
    }

    setImporting(true);
    setError(null);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/civilkoll/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: importText }),
      });
      const data = (await res.json()) as {
        error?: string;
        imported?: number;
        skipped?: number;
        invalid?: number;
      };
      if (!res.ok) {
        setError(data.error ?? "Importen misslyckades.");
        return;
      }

      const imported = data.imported ?? 0;
      const skipped = data.skipped ?? 0;
      const invalid = data.invalid ?? 0;

      if (imported === 0 && skipped > 0 && invalid === 0) {
        setImportResult(
          `Alla ${skipped} nummer finns redan i databasen — inget nytt att importera.`
        );
      } else {
        setImportResult(
          `${imported} importerade, ${skipped} hoppades över (fanns redan), ${invalid} ogiltiga rader.`
        );
      }
      setImportText("");
      router.refresh();
    } finally {
      setImporting(false);
    }
  }

  async function handleSave() {
    const normalized = normalizeRegistrationNumber(registration);
    if (normalized.length < 2) {
      setError("Ange registreringsnummer.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/civilkoll/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationNumber: registration,
          adminNote,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Kunde inte spara.");
        return;
      }
      setRegistration("");
      setAdminNote("");
      setShowForm(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted">
          Godkända registreringar — sökbara av förare
          {registry.length > 0 && (
            <span className="text-foreground"> ({registry.length} st)</span>
          )}
          .
        </p>
        {!showForm && !showImport && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => {
                setShowImport(true);
                setShowForm(false);
                setError(null);
                setImportResult(null);
              }}
              className="inline-flex items-center gap-1 rounded-xl border border-card-border bg-card px-3 py-2 text-xs font-semibold"
            >
              Importera lista
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                setShowImport(false);
                setError(null);
              }}
              className="inline-flex items-center gap-1 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Lägg till
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">Ny registrering</p>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              className="text-muted hover:text-foreground"
              aria-label="Stäng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <label className="text-xs font-medium text-muted">
            Registreringsnummer *
          </label>
          <input
            type="text"
            autoCapitalize="characters"
            placeholder="ABC123"
            value={registration}
            onChange={(e) => setRegistration(e.target.value)}
            className="field mt-1 text-base font-semibold uppercase"
          />
          <label className="mt-3 block text-xs font-medium text-muted">
            Adminanteckning (valfritt)
          </label>
          <textarea
            rows={2}
            placeholder="Ex. Bekräftad genom tidigare erfarenhet."
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            className="field mt-1 min-h-[72px] resize-none text-sm"
          />
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="btn-primary flex-1 !min-h-[44px] text-sm disabled:opacity-50"
            >
              {saving ? "Sparar…" : "Spara"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              className="btn-secondary flex-1 !min-h-[44px] text-sm"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {showImport && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-semibold">Importera registreringsnummer</p>
            <button
              type="button"
              onClick={() => {
                setShowImport(false);
                setError(null);
                setImportResult(null);
              }}
              className="text-muted hover:text-foreground"
              aria-label="Stäng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            En rad per nummer. Mellanslag och bindestreck tas bort automatiskt.
            Dubbletter hoppas över. Ursprungsraden sparas som intern
            adminanteckning.
          </p>
          <textarea
            rows={8}
            placeholder={"ABC123\nABC 456\nDEF-789"}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="field mt-3 min-h-[160px] resize-y font-mono text-sm uppercase"
          />
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          {importResult && (
            <p className="mt-2 text-sm text-success">{importResult}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={importing}
              onClick={() => void handleImport()}
              className="btn-primary flex-1 !min-h-[44px] text-sm disabled:opacity-50"
            >
              {importing ? "Importerar…" : "Importera"}
            </button>
            <button
              type="button"
              disabled={importing}
              onClick={() => {
                setShowImport(false);
                setError(null);
                setImportResult(null);
              }}
              className="btn-secondary flex-1 !min-h-[44px] text-sm"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      <input
        type="search"
        className="field"
        placeholder="Sök registreringsnummer"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">
          {registry.length === 0
            ? "Databasen är tom. Lägg till registreringar manuellt eller godkänn anmälningar."
            : "Inga träffar."}
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((entry) => (
            <li
              key={entry.id}
              className="rounded-2xl border border-card-border bg-card p-4"
            >
              <p className="text-lg font-bold tracking-wide">
                {entry.registration_number}
              </p>
              <dl className="mt-2 space-y-1 text-xs text-muted">
                <div className="flex justify-between gap-4">
                  <dt>Datum tillagd</dt>
                  <dd className="text-right text-foreground/90">
                    {formatCivilkollObservedDate(entry.created_at)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Tillagd av</dt>
                  <dd className="text-right text-foreground/90">
                    {entry.approver_cabradar_user_id ??
                      entry.approver_display_name ??
                      "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Källa</dt>
                  <dd className="text-right text-foreground/90">
                    {civilSourceLabel(entry.source)}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Antal observationer</dt>
                  <dd className="text-right font-semibold text-foreground">
                    {entry.observation_count}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Senast observerad</dt>
                  <dd className="text-right text-foreground/90">
                    {formatCivilkollObservedDate(entry.last_observed_at)}
                  </dd>
                </div>
                {entry.approved_at && (
                  <div className="flex justify-between gap-4">
                    <dt>Godkänd</dt>
                    <dd className="text-right text-foreground/90">
                      {formatCivilDateTime(entry.approved_at)}
                    </dd>
                  </div>
                )}
              </dl>
              {entry.admin_note && (
                <p className="mt-3 rounded-xl bg-background/60 p-3 text-sm leading-relaxed">
                  <span className="text-muted">Adminanteckning: </span>
                  {entry.admin_note}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
