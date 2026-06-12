import {
  ACTIVITY_RECORD_COOLDOWN_MS,
  type AnonymizedActivityPoint,
} from "@/lib/driver-activity";

const STORAGE_KEY = "cabrader_last_activity_record_ms";

function readPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 120_000,
      timeout: 12_000,
    });
  });
}

export function shouldRecordDriverActivity(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return true;
  const last = Number(raw);
  if (!Number.isFinite(last)) return true;
  return Date.now() - last >= ACTIVITY_RECORD_COOLDOWN_MS;
}

function markActivityRecorded(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, String(Date.now()));
}

export async function recordDriverActivityAt(
  latitude: number,
  longitude: number,
  source?: string
): Promise<void> {
  const res = await fetch("/api/profile/activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latitude, longitude, source }),
  });

  if (res.ok) {
    markActivityRecorded();
  }
}

export async function recordDriverActivityFromDevice(
  source?: string
): Promise<void> {
  try {
    const position = await readPosition();
    await recordDriverActivityAt(
      position.coords.latitude,
      position.coords.longitude,
      source
    );
  } catch {
    // Best effort — no user-facing error
  }
}

/** Record once when the app resumes after inactivity (no background polling). */
export async function recordDriverActivityIfDue(source = "app_resume"): Promise<void> {
  if (!shouldRecordDriverActivity()) return;
  await recordDriverActivityFromDevice(source);
}

export type { AnonymizedActivityPoint };
