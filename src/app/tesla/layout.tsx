import { redirect } from "next/navigation";
import { TeslaViewShell } from "@/components/tesla/TeslaViewShell";
import { ensureTeslaPreferenceOnFirstVisit } from "@/lib/preferred-view-server";
import { isTeslaBetaUser } from "@/lib/tesla-beta";
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
    .select(
      "is_admin, tesla_view_enabled, tesla_beta, membership_type, test_mode_enabled"
    )
    .eq("id", user.id)
    .single();

  const teslaBetaDriver = isTeslaBetaUser(profile) && !profile?.is_admin;

  if (!profile?.is_admin && profile?.tesla_view_enabled === false && !teslaBetaDriver) {
    redirect("/");
  }

  const service = await createServiceClient();
  await ensureTeslaPreferenceOnFirstVisit(service, user.id);

  return (
    <TeslaViewShell
      hideViewSwitcher={teslaBetaDriver}
      showTestModeToggle={teslaBetaDriver}
      showLogoutButton={teslaBetaDriver}
      testModeEnabled={Boolean(profile?.test_mode_enabled)}
      userId={user.id}
    >
      {children}
    </TeslaViewShell>
  );
}
