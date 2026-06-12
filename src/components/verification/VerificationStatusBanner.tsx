import { ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import {
  VERIFICATION_STATUS_LABELS,
  type DriverVerificationStatus,
} from "@/lib/verification";
import { cn } from "@/lib/utils";

interface VerificationStatusBannerProps {
  status: DriverVerificationStatus;
  className?: string;
}

export function VerificationStatusBanner({
  status,
  className,
}: VerificationStatusBannerProps) {
  if (status === "verified") return null;

  const isPending = status === "pending_verification";

  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        isPending
          ? "border-accent/40 bg-accent/10"
          : "border-danger/40 bg-danger/10",
        className
      )}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        {isPending ? (
          <ShieldAlert className="h-5 w-5 shrink-0 text-accent-bright" />
        ) : (
          <ShieldX className="h-5 w-5 shrink-0 text-danger" />
        )}
        <div>
          <p className="font-semibold">
            {VERIFICATION_STATUS_LABELS[status]}
          </p>
          {isPending ? (
            <p className="mt-1 text-sm text-muted leading-relaxed">
              Vi granskar ditt leg. Tills dess: inga varningar, erbjudanden
              eller poäng. Tar oftast 1–2 dagar.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted leading-relaxed">
              Verifiering nekad. Kontakta CabRadar om du tror det är fel.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function VerificationStatusBadge({
  status,
}: {
  status: DriverVerificationStatus;
}) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
        <ShieldCheck className="h-3.5 w-3.5" />
        Verifierad
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "pending_verification"
          ? "bg-accent/15 text-accent-bright"
          : "bg-danger/15 text-danger"
      )}
    >
      {VERIFICATION_STATUS_LABELS[status]}
    </span>
  );
}
