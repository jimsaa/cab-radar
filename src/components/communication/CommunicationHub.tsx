"use client";

import { useState } from "react";
import { CommunicationLinks } from "./CommunicationLinks";
import { FeedbackModal } from "./FeedbackModal";
import { PartnerModal } from "./PartnerModal";
import { SupportModal } from "./SupportModal";
import { cn } from "@/lib/utils";

interface CommunicationHubProps {
  isLoggedIn: boolean;
  className?: string;
}

export function CommunicationHub({
  isLoggedIn,
  className,
}: CommunicationHubProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);

  return (
    <>
      <CommunicationLinks
        isLoggedIn={isLoggedIn}
        className={cn(className)}
        onFeedback={() => setFeedbackOpen(true)}
        onSupport={() => setSupportOpen(true)}
        onPartner={() => setPartnerOpen(true)}
      />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
      <PartnerModal open={partnerOpen} onClose={() => setPartnerOpen(false)} />
    </>
  );
}

/** Logged-in only: Support link */
export function SupportLink({
  className,
  variant = "link",
}: {
  className?: string;
  variant?: "link" | "button";
}) {
  const [supportOpen, setSupportOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setSupportOpen(true)}
        className={cn(
          variant === "link"
            ? "text-sm font-medium text-accent transition-colors hover:text-accent-bright"
            : "btn-secondary w-full",
          className
        )}
      >
        Support
      </button>
      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  );
}

export function PartnerLink({ className }: { className?: string }) {
  const [partnerOpen, setPartnerOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setPartnerOpen(true)}
        className={cn(
          "text-sm font-medium text-accent transition-colors hover:text-accent-bright",
          className
        )}
      >
        Bli partner
      </button>
      <PartnerModal open={partnerOpen} onClose={() => setPartnerOpen(false)} />
    </>
  );
}
