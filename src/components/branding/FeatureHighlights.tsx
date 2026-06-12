import { cn } from "@/lib/utils";

const FEATURES = [
  { icon: "📡", label: "Trafikläge" },
  { icon: "🎁", label: "Erbjudanden" },
  { icon: "❓", label: "Förarhjälp" },
  { icon: "🚕", label: "Endast taxiförare" },
] as const;

interface FeatureHighlightsProps {
  className?: string;
  compact?: boolean;
}

export function FeatureHighlights({
  className,
  compact = false,
}: FeatureHighlightsProps) {
  return (
    <div
      className={cn(
        "grid w-full max-w-sm grid-cols-2 gap-2.5",
        compact ? "mt-4" : "mt-5",
        className
      )}
      aria-label="CabRadar-funktioner"
    >
      {FEATURES.map(({ icon, label }) => (
        <div
          key={label}
          className={cn(
            "flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border border-card-border bg-card/60 px-2 py-3",
            "transition-all duration-200 hover:border-accent/25 hover:bg-card active:scale-[0.97]"
          )}
        >
          <span className="text-2xl leading-none" aria-hidden>
            {icon}
          </span>
          <span className="text-center text-xs font-medium leading-tight text-foreground">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
