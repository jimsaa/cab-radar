import { redirect } from "next/navigation";
import { TeslaViewShell } from "@/components/tesla/TeslaViewShell";
import { ensureTeslaPreferenceOnFirstVisit } from "@/lib/preferred-view-server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, tesla_view_enabled, verification_status")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin && profile?.tesla_view_enabled === false) {
    redirect("/");
  }

  const service = await createServiceClient();
  await ensureTeslaPreferenceOnFirstVisit(service, user.id);

  return <TeslaViewShell>{children}</TeslaViewShell>;
}
