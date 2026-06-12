"use client";

import Link from "next/link";
import { ChevronRight, Tag, BookOpen, Shield, FileText } from "lucide-react";
import { SupportLink } from "@/components/communication/CommunicationHub";
import { cn } from "@/lib/utils";

const linkRowClass =
  "flex w-full items-center gap-3 rounded-2xl border border-card-border bg-card px-4 py-3.5 text-left transition hover:bg-card/80";

interface ProfileResourcesSectionProps {
  className?: string;
}

export function ProfileResourcesSection({
  className,
}: ProfileResourcesSectionProps) {
  return (
    <section className={cn(className)}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Mer i CabRadar
      </h2>
      <div className="flex flex-col gap-2">
        <Link href="/deals" className={linkRowClass}>
          <Tag className="h-5 w-5 shrink-0 text-accent" />
          <span className="flex-1 font-medium">Erbjudanden</span>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Link>

        <Link href="/help" className={linkRowClass}>
          <BookOpen className="h-5 w-5 shrink-0 text-accent" />
          <span className="flex-1 font-medium">Hjälp & guider</span>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Link>

        <div className={cn(linkRowClass, "justify-between")}>
          <span className="flex items-center gap-3">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center text-accent">
              💬
            </span>
            <SupportLink
              variant="link"
              className="font-medium text-foreground hover:text-accent"
            />
          </span>
          <ChevronRight className="h-4 w-4 text-muted" />
        </div>

        <Link href="/help/information" className={linkRowClass}>
          <Shield className="h-5 w-5 shrink-0 text-accent" />
          <span className="flex-1 font-medium">Integritet</span>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Link>

        <Link href="/help/information" className={linkRowClass}>
          <FileText className="h-5 w-5 shrink-0 text-accent" />
          <span className="flex-1 font-medium">Villkor</span>
          <ChevronRight className="h-4 w-4 text-muted" />
        </Link>
      </div>
    </section>
  );
}
