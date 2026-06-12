"use client";

import { cn } from "@/lib/utils";

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  className?: string;
}

export function AdminPageHeader({
  title,
  description,
  className,
}: AdminPageHeaderProps) {
  return (
    <header className={cn("py-4", className)}>
      <div className="min-w-0">
        <h1 className="text-xl font-bold">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted">{description}</p>
        )}
      </div>
    </header>
  );
}
