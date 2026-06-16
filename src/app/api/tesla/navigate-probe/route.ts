import { NextResponse } from "next/server";
import {
  teslaNavigateHttpsUrl,
  teslaNavigateHttpsUrlA,
  teslaNavigateHttpsUrlC,
  teslaNavigateSchemeUrl,
} from "@/lib/tesla-navigation";
import type { TeslaUrlProbeResult, TeslaUrlVariant } from "@/lib/tesla-navigation-debug";

const PROBE_TARGETS: { variant: TeslaUrlVariant; build: (lat: number, lon: number) => string }[] =
  [
    { variant: "A", build: teslaNavigateHttpsUrlA },
    { variant: "B", build: teslaNavigateHttpsUrl },
    { variant: "C", build: teslaNavigateHttpsUrlC },
  ];

async function probeUrl(
  variant: TeslaUrlVariant,
  url: string
): Promise<TeslaUrlProbeResult> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
    });

    const ok = res.ok && res.status < 500;
    console.log("[TESLA NAV PROBE]", variant, url, "→", res.status, ok ? "OK" : "FAIL");

    return { variant, url, status: res.status, ok };
  } catch (err) {
    console.warn("[TESLA NAV PROBE]", variant, url, "fetch failed:", err);
    return {
      variant,
      url,
      status: 0,
      ok: false,
      error: err instanceof Error ? err.message : "fetch failed",
    };
  }
}

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

  const variants = await Promise.all(
    PROBE_TARGETS.map(({ variant, build }) => probeUrl(variant, build(lat, lon)))
  );

  const schemeUrl = teslaNavigateSchemeUrl(lat, lon);
  variants.push({
    variant: "scheme",
    url: schemeUrl,
    status: 0,
    ok: false,
    error: "Custom scheme — not HTTP-probeable from server",
  });

  const primary = variants.find((entry) => entry.variant === "B") ?? variants[0];

  return NextResponse.json({
    ok: primary?.ok === true,
    status: primary?.status ?? 0,
    variants,
  });
}
