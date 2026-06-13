"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { TeslaCommandCenter } from "@/components/admin/TeslaCommandCenter";
import { TESLA_COMMAND_CENTER_MIN_WIDTH } from "@/lib/admin-command-center";

export function AdminWideScreenGate({
  isFullAdmin,
  children,
}: {
  isFullAdmin: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${TESLA_COMMAND_CENTER_MIN_WIDTH}px)`);
    const update = () => setIsWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const showDispatch = isFullAdmin && isWide && pathname === "/admin";

  useEffect(() => {
    if (showDispatch) {
      document.body.classList.add("tesla-command-center-active");
    } else {
      document.body.classList.remove("tesla-command-center-active");
    }
    return () => document.body.classList.remove("tesla-command-center-active");
  }, [showDispatch]);

  if (showDispatch) {
    return <TeslaCommandCenter />;
  }

  return <>{children}</>;
}