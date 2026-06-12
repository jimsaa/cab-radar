export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getNotificationPermission():
  | NotificationPermission
  | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export type PushFailureReason =
  | "permission_denied"
  | "service_worker_failed"
  | "subscription_failed"
  | "database_failed"
  | "unsupported"
  | "vapid_missing";

export type PushEnableResult =
  | { ok: true }
  | { ok: false; reason: PushFailureReason; detail?: string };

export function pushFailureMessage(reason: PushFailureReason): string {
  switch (reason) {
    case "permission_denied":
      return "Du nekade notiser i webbläsaren.";
    case "service_worker_failed":
      return "Kunde inte registrera notistjänsten.";
    case "subscription_failed":
      return "Kunde inte skapa push-prenumeration.";
    case "database_failed":
      return "Kunde inte spara notisinställningen.";
    case "vapid_missing":
      return "Kunde inte skapa push-prenumeration.";
    case "unsupported":
      return "Push-notiser stöds inte i den här webbläsaren.";
  }
}

function logPush(step: string, detail?: unknown): void {
  if (detail !== undefined) {
    console.error(`[PUSH] ${step}:`, detail);
  } else {
    console.error(`[PUSH] ${step}`);
  }
}

async function saveSubscriptionToServer(
  subscription: PushSubscription
): Promise<PushEnableResult> {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    logPush("Subscription missing keys", json);
    return {
      ok: false,
      reason: "subscription_failed",
      detail: "Subscription JSON incomplete",
    };
  }

  try {
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        step?: string;
      } | null;
      logPush("Database save failed", { status: res.status, body });
      return {
        ok: false,
        reason: "database_failed",
        detail: body?.error ?? `HTTP ${res.status}`,
      };
    }

    return { ok: true };
  } catch (err) {
    logPush("Database save failed", err);
    return {
      ok: false,
      reason: "database_failed",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    logPush("Service Worker not supported");
    return null;
  }

  try {
    let registration = await navigator.serviceWorker.getRegistration("/");
    if (!registration) {
      registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
    }
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    logPush("Service worker registration failed", err);
    return null;
  }
}

export async function hasActivePushSubscription(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== "granted") {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (err) {
    logPush("Could not read push subscription", err);
    return false;
  }
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported() || Notification.permission !== "granted") {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  } catch (err) {
    logPush("Could not get push subscription", err);
    return null;
  }
}

export async function subscribeToPush(): Promise<PushEnableResult> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!isPushSupported()) {
    logPush("Push unsupported in this browser");
    return { ok: false, reason: "unsupported" };
  }

  if (!publicKey) {
    logPush("VAPID public key missing (NEXT_PUBLIC_VAPID_PUBLIC_KEY)");
    return { ok: false, reason: "vapid_missing" };
  }

  if (Notification.permission !== "granted") {
    logPush("Permission denied", Notification.permission);
    return { ok: false, reason: "permission_denied" };
  }

  const registration = await registerServiceWorker();
  if (!registration) {
    return { ok: false, reason: "service_worker_failed" };
  }

  let subscription: PushSubscription | null = null;
  try {
    subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
  } catch (err) {
    logPush("Subscription creation failed", err);
    return {
      ok: false,
      reason: "subscription_failed",
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  if (!subscription) {
    logPush("Subscription creation failed", "No subscription returned");
    return { ok: false, reason: "subscription_failed" };
  }

  return saveSubscriptionToServer(subscription);
}

/** Sync an existing browser subscription to Supabase without re-subscribing. */
export async function syncExistingPushSubscription(): Promise<PushEnableResult> {
  if (!isPushSupported()) {
    return { ok: false, reason: "unsupported" };
  }

  if (Notification.permission !== "granted") {
    return { ok: false, reason: "permission_denied" };
  }

  const subscription = await getCurrentPushSubscription();
  if (!subscription) {
    return { ok: false, reason: "subscription_failed", detail: "Not subscribed" };
  }

  return saveSubscriptionToServer(subscription);
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
    }
  } catch (err) {
    logPush("Local unsubscribe failed", err);
  }

  try {
    const res = await fetch("/api/push/unsubscribe", { method: "DELETE" });
    return res.ok;
  } catch (err) {
    logPush("Server unsubscribe failed", err);
    return false;
  }
}

/** Request OS permission (if needed) and register push subscription. */
export async function enablePushNotifications(): Promise<PushEnableResult> {
  if (!isPushSupported()) {
    logPush("Push unsupported in this browser");
    return { ok: false, reason: "unsupported" };
  }

  let permission = Notification.permission;
  if (permission === "default") {
    try {
      permission = await Notification.requestPermission();
    } catch (err) {
      logPush("Permission request failed", err);
      return {
        ok: false,
        reason: "permission_denied",
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (permission === "denied") {
    logPush("Permission denied by user");
    return { ok: false, reason: "permission_denied" };
  }

  if (permission !== "granted") {
    logPush("Unexpected permission state", permission);
    return { ok: false, reason: "permission_denied", detail: permission };
  }

  return subscribeToPush();
}

export function playAlertChime(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Audio not available
  }
}
