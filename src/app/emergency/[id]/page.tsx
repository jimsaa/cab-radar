import { redirect } from "next/navigation";
import { EmergencySafetyGuidance } from "@/components/alerts/EmergencySafetyGuidance";
import { PublicEmergencyAlertView } from "@/components/alerts/PublicEmergencyAlertView";
import { PUBLIC_EMERGENCY_LABEL } from "@/lib/emergency-privacy";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: PUBLIC_EMERGENCY_LABEL };

const PUBLIC_EMERGENCY_SELECT =
  "id, type, status, road_address, city, latitude, longitude, emergency_last_latitude, emergency_last_longitude, created_at";

export default async function EmergencyAwarenessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { id } = await params;

  const { data: alert } = await supabase
    .from("driver_alerts")
    .select(PUBLIC_EMERGENCY_SELECT)
    .eq("id", id)
    .single();

  if (
    !alert ||
    alert.type !== "taxi_emergency" ||
    alert.status !== "active"
  ) {
    redirect("/");
  }

  return (
    <div className="safe-bottom mx-auto max-w-lg px-4 pb-8 pt-4">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Tillbaka
      </Link>

      <h1 className="mb-2 text-xl font-bold">🆘 {PUBLIC_EMERGENCY_LABEL}</h1>
      <p className="mb-4 text-sm text-muted">
        En förare i närheten har aktiverat nödläge. CabRadar visar endast
        ungefärlig plats — inga personuppgifter.
      </p>

      <PublicEmergencyAlertView alert={alert} showGuidance={false} />

      <EmergencySafetyGuidance className="mt-4" />
    </div>
  );
}
