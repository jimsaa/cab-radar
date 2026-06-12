import { redirect } from "next/navigation";
import { AdminHelpManager } from "@/components/admin/AdminHelpManager";
import { AdminNav } from "@/components/admin/AdminNav";
import { fetchAllHelpArticles } from "@/lib/help";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin — Hjälp" };

export default async function AdminHelpPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/");

  const articles = await fetchAllHelpArticles(supabase);

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 pb-4">
      <h1 className="py-4 text-xl font-bold">Hjälpartiklar</h1>
      <AdminNav />
      <p className="mb-4 text-sm text-muted">
        Publicera och verifiera för att visa på Hjälp-sidan.
      </p>
      <AdminHelpManager articles={articles} />
    </div>
  );
}
