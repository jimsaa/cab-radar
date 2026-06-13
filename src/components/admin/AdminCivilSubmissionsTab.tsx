"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CivilSubmissionWithSubmitter } from "@/lib/civilkoll";
import { formatCivilDateTime } from "@/lib/civilkoll";
import { cn } from "@/lib/utils";
import { useAdminToast } from "@/components/admin/AdminToast";
import { ExternalLink } from "lucide-react";

const STATUS_LABELS = {
  pending: "Väntar",
  approved: "Godkänd",
  rejected: "Avvisad",
} as const;

function investigationLinks(registrationNumber: string) {
  const reg = encodeURIComponent(registrationNumber);
  const trafik = encodeURIComponent(`${registrationNumber} trafikverket`);
  return {
    trafikverket: `https://www.google.com/search?q=${trafik}`,
    google: `https://www.google.com/search?q=${reg}`,
  };
}

export function AdminCivilSubmissionsTab({
  submissions,
}: {
  submissions: CivilSubmissionWithSubmitter[];
}) {
  const router = useRouter();
  const showToast = useAdminToast();
  const [filter, setFilter] = useState<"pending" | "all" | "approved" | "rejected">(
    "pending"
  );
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [investigatingId, setInvestigatingId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      submissions.filter((item) =>
        filter === "all" ? true : item.status === filter
      ),
    [submissions, filter]
  );

  async function review(
    submissionId: string,
    action: "approve" | "reject"
  ) {
    setBusyId(submissionId);
    try {
      const res = await fetch("/api/admin/civilkoll/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          action,
          adminNotes: notes[submissionId] ?? "",
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        showToast(data.error ?? "Kunde inte granska.", { variant: "error" });
        return;
      }
      setInvestigatingId(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Alla föraranmälningar. Godkända flyttas till Civilkoll-databasen.
      </p>

      <div className="flex flex-wrap gap-2">
        {(["pending", "all", "approved", "rejected"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              filter === option
                ? "bg-accent text-white"
                : "border border-card-border bg-card text-muted"
            )}
          >
            {option === "all"
              ? "Alla"
              : option === "pending"
                ? "Väntar"
                : STATUS_LABELS[option]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">Inga anmälningar i denna vy.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => {
            const links = investigationLinks(item.registration_number);
            const isInvestigating = investigatingId === item.id;

            return (
              <li
                key={item.id}
                className="rounded-2xl border border-card-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted">Registreringsnummer: </span>
                      <span className="text-lg font-bold tracking-wide">
                        {item.registration_number}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted">Kommentar: </span>
                      <span className="text-foreground/90">
                        {item.comment?.trim() || "—"}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted">Datum: </span>
                      {formatCivilDateTime(item.created_at)}
                    </p>
                    <p>
                      <span className="text-muted">CabRadar-ID: </span>
                      <span className="font-medium text-foreground/90">
                        {item.submitter_cabradar_user_id ?? "—"}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted">Inskickad av: </span>
                      <span className="font-medium text-foreground/90">
                        {item.submitter_display_name ??
                          item.submitter_cabradar_user_id ??
                          "—"}
                      </span>
                    </p>
                    {item.report_count > 1 && (
                      <p className="text-xs text-muted">
                        Rapporterad {item.report_count} gånger
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      item.status === "pending" && "bg-amber-500/20 text-amber-300",
                      item.status === "approved" && "bg-success/20 text-success",
                      item.status === "rejected" && "bg-muted/20 text-muted"
                    )}
                  >
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>

                {item.admin_note && item.status !== "pending" && (
                  <p className="mt-2 text-xs text-muted">
                    Adminanteckning: {item.admin_note}
                  </p>
                )}

                {item.status === "pending" && (
                  <div className="mt-3 space-y-2">
                    <button
                      type="button"
                      onClick={() =>
                        setInvestigatingId(isInvestigating ? null : item.id)
                      }
                      className={cn(
                        "w-full rounded-xl border px-3 py-2 text-xs font-medium",
                        isInvestigating
                          ? "border-accent/50 bg-accent/10 text-accent"
                          : "border-card-border bg-background/40 text-foreground"
                      )}
                    >
                      🔎 Kontrollera
                    </button>

                    {isInvestigating && (
                      <div className="rounded-xl border border-card-border bg-background/50 p-3 text-xs leading-relaxed text-muted">
                        <p className="font-medium text-foreground">
                          Manuell kontroll
                        </p>
                        <p className="mt-1">
                          Kontrollera fordonet via externa källor och egna
                          observationer innan godkännande.
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          <li>
                            <a
                              href={links.trafikverket}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-accent hover:underline"
                            >
                              Trafikverket / Google
                              <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                          </li>
                          <li>
                            <a
                              href={links.google}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-accent hover:underline"
                            >
                              Google-sökning
                              <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                          </li>
                          <li>Egna observationer</li>
                          <li>Diskussion med betrodda förare</li>
                        </ul>
                      </div>
                    )}

                    <label className="text-xs font-medium text-muted">
                      ✏️ Adminanteckning
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Ex. Känd observation."
                      value={notes[item.id] ?? ""}
                      onChange={(e) =>
                        setNotes((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      className="field min-h-[64px] resize-none text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => review(item.id, "approve")}
                        className="btn-primary flex-1 !min-h-[40px] !py-2 text-xs disabled:opacity-50"
                      >
                        ✅ Godkänn
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => review(item.id, "reject")}
                        className="btn-danger flex-1 !min-h-[40px] !py-2 text-xs disabled:opacity-50"
                      >
                        ❌ Avvisa
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
