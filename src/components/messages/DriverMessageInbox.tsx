"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { DriverInboxMessage } from "@/lib/admin-messages.shared";
import { cn } from "@/lib/utils";

const INBOX_POLL_MS = 20_000;

interface DriverMessageInboxProps {
  /** Tesla View — larger typography, bottom overlay. */
  variant?: "mobile" | "tesla";
}

export function DriverMessageInbox({ variant = "mobile" }: DriverMessageInboxProps) {
  const [messages, setMessages] = useState<DriverInboxMessage[]>([]);
  const [visible, setVisible] = useState<DriverInboxMessage | null>(null);
  const isTesla = variant === "tesla";

  const pollInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/inbox");
      const data = (await res.json()) as {
        ok?: boolean;
        messages?: DriverInboxMessage[];
      };
      if (!res.ok || !data.ok) return;

      const incoming = data.messages ?? [];
      setMessages(incoming);
      setVisible((current) => {
        if (current) {
          const stillThere = incoming.find(
            (m) => m.delivery_id === current.delivery_id
          );
          return stillThere ?? incoming[0] ?? null;
        }
        return incoming[0] ?? null;
      });
    } catch {
      // silent — inbox is best-effort
    }
  }, []);

  useEffect(() => {
    void pollInbox();
    const id = window.setInterval(() => void pollInbox(), INBOX_POLL_MS);
    return () => window.clearInterval(id);
  }, [pollInbox]);

  async function dismiss(deliveryId: string) {
    try {
      await fetch("/api/messages/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryId }),
      });
    } catch {
      // still hide locally
    }

    setMessages((prev) => {
      const remaining = prev.filter((m) => m.delivery_id !== deliveryId);
      setVisible((current) =>
        current?.delivery_id === deliveryId ? remaining[0] ?? null : current
      );
      return remaining;
    });
  }

  if (!visible) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 z-[180] flex justify-center px-4",
        isTesla ? "bottom-6" : "bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]"
      )}
      role="presentation"
    >
      <div
        className={cn(
          "pointer-events-auto w-full max-w-lg rounded-2xl border shadow-2xl",
          visible.important
            ? "border-amber-400/50 bg-amber-500/15 shadow-amber-500/10"
            : isTesla
              ? "border-[#3A4048] bg-[#262B31]"
              : "border-card-border bg-card"
        )}
        role="dialog"
        aria-labelledby="driver-admin-message-title"
        aria-modal="true"
      >
        <div className="flex items-start gap-3 p-4 sm:p-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {visible.important && (
                <AlertTriangle
                  className="h-5 w-5 shrink-0 text-amber-400"
                  aria-hidden
                />
              )}
              <p
                id="driver-admin-message-title"
                className={cn(
                  "font-bold",
                  isTesla ? "text-lg text-white" : "text-base text-foreground"
                )}
              >
                {visible.sender_label}
              </p>
            </div>
            <p
              className={cn(
                "mt-0.5 text-xs",
                isTesla ? "text-[#8A9099]" : "text-muted"
              )}
            >
              {visible.time_label}
            </p>
            <p
              className={cn(
                "mt-3 leading-relaxed",
                isTesla ? "text-xl text-white" : "text-base text-foreground",
                visible.important && "font-medium text-amber-100"
              )}
            >
              {visible.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void dismiss(visible.delivery_id)}
            className={cn(
              "shrink-0 rounded-full p-2",
              isTesla
                ? "text-[#8A9099] hover:bg-[#1B1E22] hover:text-white"
                : "text-muted hover:bg-background/60"
            )}
            aria-label="Stäng meddelande"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="border-t border-white/10 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => void dismiss(visible.delivery_id)}
            className={cn(
              "w-full rounded-xl py-3 text-sm font-semibold",
              isTesla
                ? "bg-[#1B1E22] text-white hover:bg-[#2a3038]"
                : "bg-background/60 text-foreground"
            )}
          >
            Stäng
          </button>
        </div>
      </div>
    </div>
  );
}
