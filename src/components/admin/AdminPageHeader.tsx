"use client";

import { AdminRefreshIndicator } from "@/components/admin/AdminRefreshIndicator";
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted">{description}</p>
          )}
        </div>
        <AdminRefreshIndicator className="shrink-0 pt-1 text-right" />
      </div>
    </header>
  );
}
