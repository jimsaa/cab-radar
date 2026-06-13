"use client";

import { usePathname, useRouter } from "next/navigation";

const CIVILKOLL_ADMIN_PATH = "/admin/civilkoll";
const CIVILKOLL_SECTION_ID = "admin-civilkoll";

export function TeslaOpenCivilkollButton() {
  const router = useRouter();
  const pathname = usePathname();

  function handleClick() {
    const onCivilkoll =
      pathname === CIVILKOLL_ADMIN_PATH ||
      pathname.startsWith(`${CIVILKOLL_ADMIN_PATH}/`);

    if (onCivilkoll) {
      document.getElementById(CIVILKOLL_SECTION_ID)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }

    router.push(CIVILKOLL_ADMIN_PATH);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-[#3A4048] bg-[#1B1E22] text-sm font-bold text-white transition hover:border-[#4A5159] hover:bg-[#262B31] active:scale-[0.98]"
    >
      <span aria-hidden>🔍</span>
      Öppna Civilkoll
    </button>
  );
}

export { CIVILKOLL_SECTION_ID };
