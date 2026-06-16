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
      "is_admin, tesla_view_enabled, verification_status, tesla_beta, membership_type, nickname, test_mode_enabled"
    )
    .eq("id", user.id)
    .single();

  const teslaBeta = isTeslaBetaUser(profile);

  if (!profile?.is_admin && profile?.tesla_view_enabled === false && !teslaBeta) {
    redirect("/");
  }

  const service = await createServiceClient();
  await ensureTeslaPreferenceOnFirstVisit(service, user.id);

  return (
    <TeslaViewShell
      isTeslaBeta={teslaBeta && !profile?.is_admin}
      nickname={profile?.nickname}
      testModeEnabled={Boolean(profile?.test_mode_enabled)}
      userId={user.id}
    >
      {children}
    </TeslaViewShell>
  );
}
