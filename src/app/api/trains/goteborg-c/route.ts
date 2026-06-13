import { NextResponse } from "next/server";
import { fetchGoteborgCTrainsSnapshot } from "@/lib/goteborg-c-fetch";
import { GoteborgC_CACHE_TTL_MS } from "@/lib/goteborg-c-trains";

export async function GET() {
  const snapshot = await fetchGoteborgCTrainsSnapshot();

  return NextResponse.json(snapshot, {
    headers: {
      "Cache-Control": `public, s-maxage=${Math.floor(GoteborgC_CACHE_TTL_MS / 1000)}, stale-while-revalidate=60`,
    },
  });
}
