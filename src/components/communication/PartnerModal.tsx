"use client";

import { useCallback, useState } from "react";
import {
  ModalActions,
  ModalShell,
  ModalSuccess,
  useAutoClose,
} from "@/components/ui/ModalShell";

const SUCCESS =
  "✅ Tack för ditt intresse!\nVi kontaktar dig inom kort.";

interface PartnerModalProps {
  open: boolean;
  onClose: () => void;
}

export function PartnerModal({ open, onClose }: PartnerModalProps) {
  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setCompanyName("");
    setContactPerson("");
    setPhone("");
    setEmail("");
    setOfferDescription("");
    setError(null);
    setSuccess(false);
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  useAutoClose(handleClose, success);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/partner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactPerson,
          phone,
          email,
          offerDescription,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Det gick inte att skicka förfrågan.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Det gick inte att ansluta till servern.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell open={open} onClose={handleClose} titleId="partner-title">
      {success ? (
        <ModalSuccess message={SUCCESS} />
      ) : (
        <>
          <h2 id="partner-title" className="text-lg font-bold">
            Erbjudanden för Sveriges taxiförare
          </h2>
          <p className="mt-1 text-sm text-muted">
            Kan du ge våra förare rabatter eller erbjudanden? Fyll i dina uppgifter
            så kontaktar vi dig inom kort.
          </p>
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-muted">Företagsnamn</span>
              <input
                className="field"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                maxLength={120}
                disabled={loading}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-muted">Kontaktperson</span>
              <input
                className="field"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                required
                maxLength={120}
                disabled={loading}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-muted">Telefonnummer</span>
              <input
                className="field"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
                disabled={loading}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-muted">E-post</span>
              <input
                className="field"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-muted">Beskriv ditt erbjudande</span>
              <textarea
                className="field min-h-[100px] resize-none"
                value={offerDescription}
                onChange={(e) => setOfferDescription(e.target.value)}
                required
                rows={3}
                disabled={loading}
              />
            </label>
            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            <ModalActions onCancel={handleClose} loading={loading} />
          </form>
        </>
      )}
    </ModalShell>
  );
}
