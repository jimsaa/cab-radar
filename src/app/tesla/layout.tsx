import { redirect } from "next/navigation";
import { TeslaViewShell } from "@/components/tesla/TeslaViewShell";
import { createClient } from "@/lib/supabase/server";

export default async function TeslaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <TeslaViewShell>{children}</TeslaViewShell>;
}
