"use client";

import { useCallback, useState } from "react";
import {
  ModalActions,
  ModalShell,
  ModalSuccess,
  useAutoClose,
} from "@/components/ui/ModalShell";

const SUCCESS =
  "✅ Tack för din synpunkt!\nDina synpunkter hjälper oss att göra CabRadar bättre.";

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setSubject("");
    setMessage("");
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
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Det gick inte att skicka synpunkten.");
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
    <ModalShell open={open} onClose={handleClose} titleId="feedback-title">
      {success ? (
        <ModalSuccess message={SUCCESS} />
      ) : (
        <>
          <h2 id="feedback-title" className="text-lg font-bold">
            Lämna synpunkt
          </h2>
          <p className="mt-1 text-sm text-muted">
            Hjälp oss att göra CabRadar bättre.
          </p>
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-muted">Ämne</span>
              <input
                className="field"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={120}
                disabled={loading}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-muted">Meddelande</span>
              <textarea
                className="field min-h-[120px] resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
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
