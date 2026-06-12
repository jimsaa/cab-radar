"use client";

import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import { APP_NAME, APP_SLOGAN } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface DashboardHeroProps {
  isVerified: boolean;
  className?: string;
}

export function DashboardHero({ isVerified, className }: DashboardHeroProps) {
  return (
    <div className={cn("relative px-4 pt-2 pb-4 text-center", className)}>
      {isVerified && (
        <div className="absolute right-4 top-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verifierad förare
          </span>
        </div>
      )}

      <div className="mx-auto flex max-w-lg flex-col items-center">
        <Image
          src="/logo.png"
          alt={APP_NAME}
          width={72}
          height={72}
          className="h-[72px] w-[72px] rounded-2xl"
          priority
        />
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-muted">{APP_SLOGAN}</p>
      </div>
    </div>
  );
}
