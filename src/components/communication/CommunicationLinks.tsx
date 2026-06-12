import { cn } from "@/lib/utils";

const linkClass =
  "text-sm font-medium text-accent transition-colors hover:text-accent-bright";

interface CommunicationLinksProps {
  isLoggedIn: boolean;
  className?: string;
  onFeedback: () => void;
  onSupport: () => void;
  onPartner: () => void;
}

export function CommunicationLinks({
  isLoggedIn,
  className,
  onFeedback,
  onSupport,
  onPartner,
}: CommunicationLinksProps) {
  return (
    <div className={cn("flex flex-wrap items-center justify-center gap-x-6 gap-y-2", className)}>
      <button type="button" onClick={isLoggedIn ? onSupport : onFeedback} className={linkClass}>
        {isLoggedIn ? "Support" : "Skicka feedback"}
      </button>
      <button type="button" onClick={onPartner} className={linkClass}>
        Bli partner
      </button>
    </div>
  );
}

export { linkClass as communicationLinkClass };
