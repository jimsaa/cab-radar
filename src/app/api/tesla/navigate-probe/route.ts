import { NextResponse } from "next/server";
import { teslaNavigateHttpsUrl } from "@/lib/tesla-navigation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latRaw = searchParams.get("lat");
  const lonRaw = searchParams.get("lon");

  const lat = latRaw != null ? Number(latRaw) : NaN;
  const lon = lonRaw != null ? Number(lonRaw) : NaN;

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { ok: false, error: "Ogiltiga koordinater." },
      { status: 400 }
    );
  }

  const url = teslaNavigateHttpsUrl(lat, lon);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
    });

    const ok = res.ok && res.status < 500;
    console.log("[TESLA NAV PROBE]", url, "→", res.status, ok ? "OK" : "FAIL");

    return NextResponse.json({ ok, status: res.status });
  } catch (err) {
    console.warn("[TESLA NAV PROBE] fetch failed:", err);
    return NextResponse.json({ ok: false, status: 0 });
  }
}
