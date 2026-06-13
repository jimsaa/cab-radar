"use client";

import { useState } from "react";
import { AdminCivilRegistryTab } from "@/components/admin/AdminCivilRegistryTab";
import { AdminCivilSubmissionsTab } from "@/components/admin/AdminCivilSubmissionsTab";
import type {
  CivilRegistryWithApprover,
  CivilSubmissionWithSubmitter,
} from "@/lib/civilkoll";
import { cn } from "@/lib/utils";

type TabId = "submissions" | "registry";

interface AdminCivilkollDashboardProps {
  submissions: CivilSubmissionWithSubmitter[];
  registry: CivilRegistryWithApprover[];
  pendingCount: number;
}

export function AdminCivilkollDashboard({
  submissions,
  registry,
  pendingCount,
}: AdminCivilkollDashboardProps) {
  const [tab, setTab] = useState<TabId>(
    pendingCount > 0 ? "submissions" : "registry"
  );

  return (
    <div className="space-y-4">
      <div className="flex rounded-xl border border-card-border bg-card p-1">
        <button
          type="button"
          onClick={() => setTab("submissions")}
          className={cn(
            "flex-1 rounded-lg px-2 py-2.5 text-xs font-semibold transition",
            tab === "submissions"
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground"
          )}
        >
          Inskickade — väntar granskning
          {pendingCount > 0 && (
            <span className="ml-1 rounded-full bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-bold text-background">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("registry")}
          className={cn(
            "flex-1 rounded-lg px-2 py-2.5 text-xs font-semibold transition",
            tab === "registry"
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground"
          )}
        >
          Civilkoll-databas
          <span className="ml-1 text-[10px] opacity-80">({registry.length})</span>
        </button>
      </div>

      {tab === "submissions" ? (
        <AdminCivilSubmissionsTab submissions={submissions} />
      ) : (
        <AdminCivilRegistryTab registry={registry} />
      )}
    </div>
  );
}
