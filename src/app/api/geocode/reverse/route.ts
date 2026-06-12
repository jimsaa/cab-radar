import { NextResponse } from "next/server";
import type { ReverseGeocodeResult } from "@/lib/types/database";

async function reverseWithGoogle(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult | null> {
  const key = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!key) return null;

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${latitude},${longitude}`);
  url.searchParams.set("key", key);

  const res = await fetch(url.toString());
  if (!res.ok) return null;

  const data = await res.json();
  const result = data.results?.[0];
  if (!result) return null;

  const components = result.address_components ?? [];
  const road =
    components.find((c: { types: string[] }) => c.types.includes("route"))
      ?.long_name ?? null;
  const streetNumber =
    components.find((c: { types: string[] }) =>
      c.types.includes("street_number")
    )?.long_name ?? null;
  const city =
    components.find((c: { types: string[] }) => c.types.includes("locality"))
      ?.long_name ??
    components.find((c: { types: string[] }) =>
      c.types.includes("postal_town")
    )?.long_name ??
    null;

  const road_address =
    road && streetNumber
      ? `${streetNumber} ${road}`
      : road ?? result.formatted_address?.split(",")[0] ?? null;

  return { road_address, city };
}

async function reverseWithNominatim(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "CabRadar/1.0" },
  });

  if (!res.ok) return { road_address: null, city: null };

  const data = await res.json();
  const addr = data.address ?? {};

  const road =
    addr.road ?? addr.pedestrian ?? addr.footway ?? addr.cycleway ?? null;
  const house = addr.house_number ?? null;
  const city =
    addr.city ?? addr.town ?? addr.village ?? addr.suburb ?? addr.municipality ?? null;

  const road_address =
    road && house ? `${house} ${road}` : road ?? data.display_name?.split(",")[0] ?? null;

  return { road_address, city };
}

export async function POST(request: Request) {
  try {
    const { latitude, longitude } = await request.json();

    if (
      typeof latitude !== "number" ||
      typeof longitude !== "number" ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude)
    ) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    const google = await reverseWithGoogle(latitude, longitude);
    if (google) return NextResponse.json(google);

    const nominatim = await reverseWithNominatim(latitude, longitude);
    return NextResponse.json(nominatim);
  } catch {
    return NextResponse.json(
      { road_address: null, city: null },
      { status: 200 }
    );
  }
}
