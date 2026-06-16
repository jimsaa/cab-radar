import { redirect } from "next/navigation";
import { CockpitViewShell } from "@/components/cockpit/CockpitViewShell";
import { createClient } from "@/lib/supabase/server";

export default async function TabLayout({
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
    .select("is_admin, tesla_view_enabled")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin && profile?.tesla_view_enabled === false) {
    redirect("/");
  }

  return (
    <CockpitViewShell subtitle="Tab View">{children}</CockpitViewShell>
  );
}
