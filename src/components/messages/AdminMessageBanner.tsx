"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ADMIN_MESSAGE_BANNER_TITLE,
  ADMIN_MESSAGE_POLL_MS,
  ADMIN_MESSAGE_SENDER_LABEL,
  type DriverInboxMessage,
} from "@/lib/admin-messages.shared";
import { cn } from "@/lib/utils";

interface AdminMessageBannerProps {
  variant?: "mobile" | "tesla";
}

export function AdminMessageBanner({ variant = "mobile" }: AdminMessageBannerProps) {
  const [message, setMessage] = useState<DriverInboxMessage | null>(null);
  const [markingRead, setMarkingRead] = useState(false);
  const isTesla = variant === "tesla";

  const pollInbox = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/inbox");
      const data = (await res.json()) as {
        ok?: boolean;
        message?: DriverInboxMessage | null;
        blockForEmergency?: boolean;
      };
      if (!res.ok || !data.ok) return;

      if (data.blockForEmergency) {
        setMessage(null);
        return;
      }

      setMessage(data.message ?? null);
    } catch {
      // silent — inbox is best-effort
    }
  }, []);

  useEffect(() => {
    void pollInbox();
    const id = window.setInterval(() => void pollInbox(), ADMIN_MESSAGE_POLL_MS);
    return () => window.clearInterval(id);
  }, [pollInbox]);

  async function markRead(readId: string) {
    if (markingRead) return;
    setMarkingRead(true);

    setMessage(null);

    try {
      await fetch("/api/messages/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ readId }),
      });
    } catch {
      // banner already hidden locally
    } finally {
      setMarkingRead(false);
      void pollInbox();
    }
  }

  if (!message) return null;

  return (
    <div
      className={cn(
        "shrink-0 border-b px-4 py-3",
        message.important
          ? isTesla
            ? "border-amber-400/50 bg-amber-500/15"
            : "border-amber-400/40 bg-amber-500/10"
          : isTesla
            ? "border-[#42A5F5]/50 bg-[#42A5F5]/12"
            : "border-accent/40 bg-accent/10"
      )}
      role="region"
      aria-labelledby="admin-message-banner-title"
    >
      <div className="mx-auto w-full max-w-lg">
        <p
          id="admin-message-banner-title"
          className={cn(
            "text-xs font-bold uppercase tracking-widest",
            isTesla ? "text-[#B0D4FF]" : "text-accent"
          )}
        >
          💬 {ADMIN_MESSAGE_BANNER_TITLE}
        </p>

        {message.important && (
          <p
            className={cn(
              "mt-1 text-xs font-bold uppercase tracking-wide",
              isTesla ? "text-amber-300" : "text-amber-600"
            )}
          >
            ⚠️ VIKTIGT MEDDELANDE
          </p>
        )}

        <p
          className={cn(
            "mt-2 leading-relaxed",
            isTesla ? "text-lg text-white" : "text-base text-foreground",
            message.important && (isTesla ? "font-medium text-amber-50" : "font-medium")
          )}
        >
          {message.message}
        </p>

        <div
          className={cn(
            "mt-2 space-y-0.5 text-xs",
            isTesla ? "text-[#8A9099]" : "text-muted"
          )}
        >
          <p>
            Skickat:{" "}
            <span className={isTesla ? "text-[#B0B6BE]" : "text-foreground/80"}>
              {message.time_label}
            </span>
          </p>
          <p>
            Från:{" "}
            <span className={isTesla ? "text-[#B0B6BE]" : "text-foreground/80"}>
              {ADMIN_MESSAGE_SENDER_LABEL}
            </span>
          </p>
        </div>

        <button
          type="button"
          disabled={markingRead}
          onClick={() => void markRead(message.read_id)}
          className={cn(
            "mt-3 w-full rounded-xl py-3 text-sm font-bold transition active:scale-[0.99] disabled:opacity-60",
            message.important
              ? isTesla
                ? "bg-amber-500/25 text-amber-100 hover:bg-amber-500/35"
                : "bg-amber-500/20 text-amber-900 hover:bg-amber-500/30"
              : isTesla
                ? "bg-[#42A5F5]/25 text-white hover:bg-[#42A5F5]/35"
                : "bg-accent/20 text-accent hover:bg-accent/30"
          )}
        >
          ✓ Läst
        </button>
      </div>
    </div>
  );
}
