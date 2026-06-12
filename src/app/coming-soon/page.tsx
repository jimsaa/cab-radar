import { ComingSoonPage } from "@/components/coming-soon/ComingSoonPage";

export const metadata = {
  title: "Snart öppnar CabRadar",
  description: "Den digitala co-piloten för taxiförare.",
};

export default async function ComingSoonRoute({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  return <ComingSoonPage notInvited={reason === "not_invited"} />;
}
