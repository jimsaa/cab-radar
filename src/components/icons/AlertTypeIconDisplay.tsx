import { ReportTypeIcon } from "@/components/icons/ReportTypeIcon";

interface AlertTypeIconDisplayProps {
  type: string;
  /** Compact layout for circular feed badges */
  variant?: "default" | "badge";
}

export function AlertTypeIconDisplay({
  type,
  variant = "default",
}: AlertTypeIconDisplayProps) {
  return (
    <ReportTypeIcon
      type={type}
      variant={variant === "badge" ? "badge" : "default"}
    />
  );
}
