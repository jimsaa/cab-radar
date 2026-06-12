"use client";

import { useState } from "react";
import { getReportCommentPreview } from "@/lib/report-comment";
import { cn } from "@/lib/utils";

interface ReportCommentPreviewProps {
  comment: string | null | undefined;
  className?: string;
  variant?: "default" | "tesla";
  expandable?: boolean;
}

export function ReportCommentPreview({
  comment,
  className,
  variant = "default",
  expandable = true,
}: ReportCommentPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const preview = getReportCommentPreview(comment);

  if (!preview) return null;

  const displayText =
    expanded && preview.truncated ? preview.full : preview.text;

  return (
    <p
      className={cn(
        "mt-1.5 text-xs leading-snug italic",
        variant === "tesla" ? "text-[#8A9099]" : "text-muted/75",
        className
      )}
    >
      <span aria-hidden>💬 </span>
      &quot;{displayText}&quot;
      {preview.truncated && expandable && !expanded && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setExpanded(true);
          }}
          className={cn(
            "ml-1 not-italic font-medium underline-offset-2 hover:underline",
            variant === "tesla" ? "text-[#B0B6BE]" : "text-muted"
          )}
        >
          Visa mer
        </button>
      )}
    </p>
  );
}
