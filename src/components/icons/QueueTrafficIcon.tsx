import { cn } from "@/lib/utils";

/** Compact three-car queue icon — matches single-emoji footprint in report buttons. */
export function QueueTrafficIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex h-8 w-[2.125rem] shrink-0 items-center justify-center",
        className
      )}
      aria-hidden
    >
      <span className="absolute left-0 text-[11px] leading-none">🚗</span>
      <span className="absolute left-[9px] text-[11px] leading-none">🚗</span>
      <span className="absolute left-[18px] text-[11px] leading-none">🚗</span>
    </span>
  );
}
