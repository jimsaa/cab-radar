import { TabDrivingMode } from "@/components/tab/TabDrivingMode";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Tab View" };

export default async function TabPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  return <TabDrivingMode isAdmin={Boolean(profile?.is_admin)} />;
}
