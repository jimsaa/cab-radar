"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Loader2, MessageCircle, Search, X } from "lucide-react";
import { useAdminToast } from "@/components/admin/AdminToast";
import {
  ADMIN_MESSAGE_MAX_LENGTH,
  type ActiveDriverOption,
  type AdminMessageHistoryItem,
} from "@/lib/admin-messages.shared";
import { cn } from "@/lib/utils";

type RecipientMode = "all" | "user";

const ADMIN_MESSAGES_HIDDEN_KEY = "cabradar_admin_messages_hidden";

interface AdminMessagesPanelProps {
  variant?: "tesla" | "dashboard";
  className?: string;
  /** Allow collapsing to a slim bar (admin command center). */
  collapsible?: boolean;
}

export function AdminMessagesPanel({
  variant = "tesla",
  className,
  collapsible = false,
}: AdminMessagesPanelProps) {
  const showToast = useAdminToast();
  const isTesla = variant === "tesla";
  const canCollapse = collapsible && isTesla;
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<AdminMessageHistoryItem[]>([]);
  const [activeDrivers, setActiveDrivers] = useState<ActiveDriverOption[]>([]);
  const [recipientMode, setRecipientMode] = useState<RecipientMode>("all");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [driverQuery, setDriverQuery] = useState("");
  const [message, setMessage] = useState("");
  const [important, setImportant] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/messages");
      const data = (await res.json()) as {
        ok?: boolean;
        history?: AdminMessageHistoryItem[];
        activeDrivers?: ActiveDriverOption[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        showToast(data.error ?? "Kunde inte hämta meddelanden.", {
          variant: "error",
        });
        return;
      }
      setHistory(data.history ?? []);
      setActiveDrivers(data.activeDrivers ?? []);
    } catch {
      showToast("Kunde inte hämta meddelanden.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    setMounted(true);
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!canCollapse) return;
    try {
      setCollapsed(window.localStorage.getItem(ADMIN_MESSAGES_HIDDEN_KEY) === "1");
    } catch {
      // Storage unavailable — default to expanded.
    }
  }, [canCollapse]);

  function setPanelCollapsed(next: boolean) {
    setCollapsed(next);
    if (!canCollapse) return;
    try {
      window.localStorage.setItem(ADMIN_MESSAGES_HIDDEN_KEY, next ? "1" : "0");
    } catch {
      // Ignore storage errors.
    }
  }

  const filteredDrivers = useMemo(() => {
    const q = driverQuery.trim().toLowerCase();
    if (!q) return activeDrivers;
    return activeDrivers.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.subtitle.toLowerCase().includes(q)
    );
  }, [activeDrivers, driverQuery]);

  const charCount = message.length;
  const canSend =
    message.trim().length > 0 &&
    charCount <= ADMIN_MESSAGE_MAX_LENGTH &&
    (recipientMode === "all" || selectedDriverId);

  function openModal() {
    setRecipientMode("all");
    setSelectedDriverId("");
    setDriverQuery("");
    setMessage("");
    setImportant(false);
    setModalOpen(true);
    void loadData();
  }

  function closeModal() {
    setModalOpen(false);
  }

  async function handleSend() {
    if (!canSend || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/admin/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          recipientType: recipientMode,
          recipientUserId:
            recipientMode === "user" ? selectedDriverId : null,
          important,
        }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
        recipientCount?: number;
      };

      if (!res.ok || !data.ok) {
        showToast(data.error ?? "Kunde inte skicka meddelandet.", {
          variant: "error",
        });
        return;
      }

      showToast(
        data.message ??
          `✅ Skickat till ${data.recipientCount ?? 0} förare.`,
        { variant: "success" }
      );
      closeModal();
      void loadData();
    } catch {
      showToast("Kunde inte skicka meddelandet.", { variant: "error" });
    } finally {
      setSending(false);
    }
  }

  const modal = modalOpen && (
    <div
      className="fixed inset-0 z-[650] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={closeModal}
      role="presentation"
    >
      <div
        className={cn(
          "flex max-h-[92dvh] w-full flex-col border shadow-2xl",
          isTesla
            ? "max-w-xl rounded-t-3xl border-[#3A4048] bg-[#1E2125] sm:rounded-3xl"
            : "max-w-lg rounded-t-3xl border-card-border bg-card sm:rounded-3xl"
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-send-message-title"
      >
        <header
          className={cn(
            "flex shrink-0 items-center justify-between border-b px-6 py-5",
            isTesla ? "border-[#3A4048]" : "border-card-border"
          )}
        >
          <h2
            id="admin-send-message-title"
            className="text-xl font-bold text-white"
          >
            💬 Skicka meddelande
          </h2>
          <button
            type="button"
            onClick={closeModal}
            className="rounded-full p-2 text-[#8A9099] hover:bg-[#262B31] hover:text-white"
            aria-label="Stäng"
          >
            <X className="h-6 w-6" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <section className="space-y-2">
            <label
              htmlFor="admin-msg-recipient"
              className="text-sm font-semibold text-[#B0B6BE]"
            >
              Mottagare
            </label>
            <select
              id="admin-msg-recipient"
              value={recipientMode}
              onChange={(e) => {
                setRecipientMode(e.target.value as RecipientMode);
                setSelectedDriverId("");
              }}
              className={cn(
                "w-full rounded-2xl border px-4 py-4 text-base font-medium text-white focus:outline-none",
                isTesla
                  ? "border-[#3A4048] bg-[#262B31] focus:border-[#42A5F5]"
                  : "field"
              )}
            >
              <option value="all">📢 Alla aktiva förare</option>
              <option value="user">🚕 Välj aktiv förare</option>
            </select>
          </section>

          {recipientMode === "user" && (
            <section className="space-y-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A9099]" />
                <input
                  type="search"
                  value={driverQuery}
                  onChange={(e) => setDriverQuery(e.target.value)}
                  placeholder="Sök nickname eller taxi…"
                  className={cn(
                    "w-full rounded-2xl border py-4 pl-11 pr-4 text-base text-white placeholder:text-[#8A9099] focus:outline-none",
                    isTesla
                      ? "border-[#3A4048] bg-[#262B31] focus:border-[#42A5F5]"
                      : "field"
                  )}
                />
              </div>
              <ul className="max-h-48 space-y-2 overflow-y-auto">
                {filteredDrivers.length === 0 ? (
                  <li className="rounded-2xl border border-dashed border-[#3A4048] px-4 py-3 text-sm text-[#8A9099]">
                    Inga aktiva förare hittades
                  </li>
                ) : (
                  filteredDrivers.map((driver) => {
                    const selected = selectedDriverId === driver.id;
                    return (
                      <li key={driver.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedDriverId(driver.id)}
                          className={cn(
                            "w-full rounded-2xl border px-4 py-3 text-left transition",
                            selected
                              ? "border-[#42A5F5] bg-[#42A5F5]/15"
                              : "border-[#3A4048] bg-[#1B1E22]/80 hover:border-[#4A5159]"
                          )}
                        >
                          <p className="font-semibold text-white">
                            {driver.label}
                          </p>
                          <p className="text-sm text-[#8A9099]">
                            {driver.subtitle}
                          </p>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </section>
          )}

          <section className="space-y-2">
            <label
              htmlFor="admin-msg-body"
              className="text-sm font-semibold text-[#B0B6BE]"
            >
              Meddelande
            </label>
            <textarea
              id="admin-msg-body"
              value={message}
              onChange={(e) =>
                setMessage(e.target.value.slice(0, ADMIN_MESSAGE_MAX_LENGTH))
              }
              placeholder="Skriv ditt meddelande..."
              rows={5}
              className={cn(
                "w-full resize-none rounded-2xl border px-4 py-4 text-lg text-white placeholder:text-[#8A9099] focus:outline-none",
                isTesla
                  ? "border-[#3A4048] bg-[#262B31] focus:border-[#42A5F5]"
                  : "field min-h-[140px]"
              )}
            />
            <p className="text-right text-sm text-[#8A9099]">
              {charCount} / {ADMIN_MESSAGE_MAX_LENGTH}
            </p>
          </section>

          <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-[#3A4048] bg-[#1B1E22]/80 px-5 py-4">
            <input
              type="checkbox"
              checked={important}
              onChange={(e) => setImportant(e.target.checked)}
              className="h-6 w-6 accent-amber-400"
            />
            <span className="flex items-center gap-2 text-base font-medium text-white">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Visa som viktigt
            </span>
          </label>
        </div>

        <footer className="shrink-0 space-y-3 border-t border-[#3A4048] px-6 py-5">
          <button
            type="button"
            disabled={!canSend || sending}
            onClick={() => void handleSend()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#42A5F5] px-6 py-5 text-lg font-bold text-white disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Skicka
          </button>
          <button
            type="button"
            disabled={sending}
            onClick={closeModal}
            className="w-full rounded-2xl border border-[#3A4048] bg-[#262B31] px-6 py-4 text-base font-semibold text-[#B0B6BE]"
          >
            Avbryt
          </button>
        </footer>
      </div>
    </div>
  );

  return (
    <>
      {canCollapse && collapsed ? (
        <button
          type="button"
          onClick={() => setPanelCollapsed(false)}
          className={cn(
            "flex w-full shrink-0 items-center justify-between gap-3 border-t border-[#3A4048] px-4 py-2.5 text-left transition hover:bg-[#2a3038]/50 active:scale-[0.995]",
            className
          )}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-[#B0B6BE]">
            <MessageCircle className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            Meddelanden
            {history.length > 0 && (
              <span className="font-normal text-[#8A9099]">
                · {history.length} skickade
              </span>
            )}
          </span>
          <span className="text-xs text-[#8A9099]">Klicka för att visa</span>
        </button>
      ) : (
      <div
        className={cn(
          isTesla
            ? "shrink-0 border-t border-[#3A4048] p-4"
            : "rounded-[18px] border border-card-border bg-card p-4",
          className
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3
            className={cn(
              "text-xs font-bold uppercase tracking-widest",
              isTesla ? "text-[#8A9099]" : "text-muted"
            )}
          >
            💬 Meddelanden
          </h3>
          {canCollapse && (
            <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-[#8A9099]">
              <input
                type="checkbox"
                checked={collapsed}
                onChange={(e) => setPanelCollapsed(e.target.checked)}
                className="h-4 w-4 rounded accent-[#42A5F5]"
              />
              Dölj
            </label>
          )}
        </div>

        <button
          type="button"
          onClick={openModal}
          className={cn(
            "flex w-full items-center gap-4 rounded-[14px] border px-4 py-4 text-left transition active:scale-[0.99]",
            isTesla
              ? "border-[#3A4048] bg-[#1B1E22]/80 text-white hover:border-[#4A5159] hover:bg-[#262B31]"
              : "border-card-border bg-background/40 hover:bg-card"
          )}
        >
          <MessageCircle
            className={cn(
              "h-6 w-6 shrink-0",
              isTesla ? "text-[#B0B6BE]" : "text-muted"
            )}
            strokeWidth={1.75}
          />
          <span className="text-base font-semibold leading-snug">
            Skicka meddelande till förare
          </span>
        </button>

        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A9099]">
            Senast skickade
          </p>
          {loading && history.length === 0 ? (
            <p className="text-sm text-[#8A9099]">Laddar…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-[#8A9099]">Inga meddelanden ännu</p>
          ) : (
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {history.slice(0, 20).map((item) => (
                <li
                  key={item.id}
                  className="rounded-[12px] border border-[#3A4048]/80 bg-[#1B1E22]/60 px-3 py-2.5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-sm text-[#B0B6BE]">
                      {item.time_label}
                    </span>
                    <span className="truncate text-xs text-[#8A9099]">
                      {item.recipient_label}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-1 text-sm leading-snug",
                      item.important
                        ? "font-semibold text-amber-200"
                        : "text-white"
                    )}
                  >
                    {item.important && (
                      <AlertTriangle className="mr-1 inline h-3.5 w-3.5 text-amber-400" />
                    )}
                    &quot;{item.preview}&quot;
                  </p>
                  {item.total_recipients > 0 && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#8A9099]">
                      <span>
                        Läst:{" "}
                        <span className="font-semibold text-[#B0B6BE]">
                          {item.read_count}/{item.total_recipients}
                        </span>
                      </span>
                      <span>
                        Oläst:{" "}
                        <span className="font-semibold text-[#B0B6BE]">
                          {item.unread_count}/{item.total_recipients}
                        </span>
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      )}

      {mounted && modal && createPortal(modal, document.body)}
    </>
  );
}
