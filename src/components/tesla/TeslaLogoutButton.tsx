"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface TeslaLogoutButtonProps {
  className?: string;
}

/** Compact logout for Tesla Beta users who cannot reach settings. */
export function TeslaLogoutButton({ className }: TeslaLogoutButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={loading}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-[#B0B6BE] transition hover:border-white/20 hover:bg-white/[0.07] hover:text-white active:scale-[0.98] disabled:opacity-50",
        className
      )}
    >
      <LogOut className="h-3.5 w-3.5" aria-hidden />
      Logga ut
    </button>
  );
}
