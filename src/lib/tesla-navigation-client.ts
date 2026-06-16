"use client";

import {
  createTeslaNavigationSession,
  isTeslaBrowserUserAgent,
  isTeslaDebugEnabled,
  logTeslaNav,
  methodLabel,
  setActiveTeslaNavigationSession,
  type TeslaNavMethod,
  type TeslaNavigationAttempt,
  type TeslaNavigationSession,
  type TeslaUrlProbeResult,
  type TeslaUrlVariant,
  variantLabel,
} from "@/lib/tesla-navigation-debug";
import {
  formatTeslaCoordinatePair,
  teslaNavigateHttpsUrl,
  teslaNavigateUrlForVariant,
  TESLA_NAV_URL_VARIANTS,
} from "@/lib/tesla-navigation";

const ATTEMPT_TIMEOUT_MS = 1800;

export interface TeslaNavigationFallbackPayload {
  lat: number;
  lng: number;
  session: TeslaNavigationSession;
}

export type TeslaNavigationFallbackHandler = (
  payload: TeslaNavigationFallbackPayload
) => void;

interface AttemptPlan {
  variant: TeslaUrlVariant;
  method: TeslaNavMethod;
  /** Stop trying further methods if this one navigates away (HTTPS). */
  mayUnloadPage: boolean;
}

const ATTEMPT_PLANS: AttemptPlan[] = [
  { variant: "B", method: "anchor_click", mayUnloadPage: false },
  { variant: "scheme", method: "anchor_click", mayUnloadPage: false },
  { variant: "B", method: "window_open_blank", mayUnloadPage: false },
  { variant: "scheme", method: "location_href", mayUnloadPage: false },
  { variant: "B", method: "window_open_self", mayUnloadPage: false },
  { variant: "A", method: "anchor_click", mayUnloadPage: false },
  { variant: "C", method: "anchor_click", mayUnloadPage: false },
  { variant: "B", method: "location_href", mayUnloadPage: true },
  { variant: "A", method: "location_href", mayUnloadPage: true },
  { variant: "C", method: "location_href", mayUnloadPage: true },
  { variant: "scheme", method: "window_open_blank", mayUnloadPage: false },
];

function waitForNavigationSignal(timeoutMs: number): Promise<{
  success: boolean;
  reason: string;
}> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (success: boolean, reason: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ success, reason });
    };

    const onBlur = () => finish(true, "window_blur");
    const onPageHide = () => finish(true, "pagehide");
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        finish(true, "visibility_hidden");
      }
    };

    const cleanup = () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearTimeout(timer);
    };

    window.addEventListener("blur", onBlur);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);

    const timer = window.setTimeout(
      () => finish(false, "timeout_no_navigation_signal"),
      timeoutMs
    );
  });
}

function dispatchNavigationMethod(url: string, method: TeslaNavMethod): string {
  switch (method) {
    case "anchor_click": {
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.rel = "noopener noreferrer";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return "anchor element clicked synchronously";
    }
    case "location_href": {
      window.location.href = url;
      return "assigned window.location.href";
    }
    case "window_open_self": {
      const opened = window.open(url, "_self");
      if (!opened) return "window.open(_self) returned null (blocked?)";
      return "window.open(_self) invoked";
    }
    case "window_open_blank": {
      const opened = window.open(url);
      if (!opened) return "window.open() returned null (popup blocked?)";
      return "window.open() invoked";
    }
  }
}

function recordAttempt(
  session: TeslaNavigationSession,
  plan: AttemptPlan,
  url: string,
  startedAt: number,
  signal: { success: boolean; reason: string },
  dispatchNote: string
): TeslaNavigationAttempt {
  const attempt: TeslaNavigationAttempt = {
    variant: plan.variant,
    method: plan.method,
    url,
    startedAt,
    endedAt: Date.now(),
    success: signal.success,
    reason: signal.success ? signal.reason : `${signal.reason}; ${dispatchNote}`,
  };

  session.attempts.push(attempt);
  setActiveTeslaNavigationSession(session);

  logTeslaNav(
    attempt.success ? "Attempt succeeded" : "Attempt failed",
    attempt
  );

  return attempt;
}

async function runAttempt(
  session: TeslaNavigationSession,
  plan: AttemptPlan
): Promise<TeslaNavigationAttempt> {
  const url = teslaNavigateUrlForVariant(plan.variant, session.lat, session.lng);
  const startedAt = Date.now();

  logTeslaNav(
    `Attempt ${variantLabel(plan.variant)} via ${methodLabel(plan.method)}`,
    url
  );
  console.log("Tesla URL:", url);

  const dispatchNote = dispatchNavigationMethod(url, plan.method);
  const signal = await waitForNavigationSignal(ATTEMPT_TIMEOUT_MS);

  return recordAttempt(session, plan, url, startedAt, signal, dispatchNote);
}

async function fetchProbeDiagnostics(
  lat: number,
  lng: number
): Promise<TeslaUrlProbeResult[]> {
  try {
    const res = await fetch(
      `/api/tesla/navigate-probe?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lng))}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { variants?: TeslaUrlProbeResult[] };
    return data.variants ?? [];
  } catch (err) {
    logTeslaNav("Probe diagnostics failed", err);
    return [];
  }
}

function logSessionStart(session: TeslaNavigationSession): void {
  const urls = TESLA_NAV_URL_VARIANTS.map((variant) => ({
    variant,
    label: variantLabel(variant),
    url: teslaNavigateUrlForVariant(variant, session.lat, session.lng),
  }));

  logTeslaNav("Navigation session started", {
    coordinates: formatTeslaCoordinatePair(session.lat, session.lng),
    primaryUrl: session.primaryUrl,
    isTeslaBrowser: session.isTeslaBrowser,
    userAgent: session.userAgent,
    urls,
  });

  for (const entry of urls) {
    console.log(`Tesla URL [${entry.variant}]:`, entry.url);
  }
}

/**
 * Opens Tesla navigation using multiple URL formats and dispatch methods.
 * The first anchor-click attempt runs synchronously in the user click handler.
 */
export function openTeslaNavigation(
  lat: number,
  lng: number,
  onFallback: TeslaNavigationFallbackHandler
): void {
  const primaryUrl = teslaNavigateHttpsUrl(lat, lng);
  const session = createTeslaNavigationSession(lat, lng, primaryUrl);
  setActiveTeslaNavigationSession(session);

  console.log("Tesla URL:", primaryUrl);
  logSessionStart(session);

  const [firstPlan, ...remainingPlans] = ATTEMPT_PLANS;
  const firstUrl = teslaNavigateUrlForVariant(firstPlan.variant, lat, lng);
  const firstStartedAt = Date.now();

  logTeslaNav(
    `First attempt (sync) ${variantLabel(firstPlan.variant)} via ${methodLabel(firstPlan.method)}`,
    firstUrl
  );

  const firstDispatchNote = dispatchNavigationMethod(firstUrl, firstPlan.method);

  void (async () => {
    const firstSignal = await waitForNavigationSignal(ATTEMPT_TIMEOUT_MS);
    const firstAttempt = recordAttempt(
      session,
      firstPlan,
      firstUrl,
      firstStartedAt,
      firstSignal,
      firstDispatchNote
    );

    if (firstAttempt.success) {
      session.outcome = "success";
      session.outcomeReason = firstAttempt.reason;
      setActiveTeslaNavigationSession(session);
      return;
    }

    session.probeResults = await fetchProbeDiagnostics(lat, lng);
    if (session.probeResults.length > 0) {
      logTeslaNav("Server-side URL probe results", session.probeResults);
      for (const probe of session.probeResults) {
        console.log(
          `Tesla URL probe [${probe.variant}] status=${probe.status} ok=${probe.ok}:`,
          probe.url
        );
      }
    }
    setActiveTeslaNavigationSession(session);

    for (const plan of remainingPlans) {
      if (document.visibilityState === "hidden") {
        session.outcome = "success";
        session.outcomeReason = "page_already_hidden";
        setActiveTeslaNavigationSession(session);
        return;
      }

      const attempt = await runAttempt(session, plan);
      if (attempt.success) {
        session.outcome = "success";
        session.outcomeReason = attempt.reason;
        setActiveTeslaNavigationSession(session);
        logTeslaNav("Navigation signal detected — stopping attempts", attempt);
        return;
      }

      if (plan.mayUnloadPage) {
        logTeslaNav(
          "HTTPS location.href attempt did not signal success — page may have navigated away"
        );
        return;
      }
    }

    session.outcome = "fallback";
    session.outcomeReason =
      "All navigation attempts failed without blur/pagehide/visibility signal";
    setActiveTeslaNavigationSession(session);

    logTeslaNav("All methods failed — showing manual fallback", session);
    onFallback({ lat, lng, session });
  })();
}

export function describeTeslaNavigationEnvironment(): {
  isTeslaBrowser: boolean;
  userAgent: string;
  debugEnabled: boolean;
} {
  const userAgent =
    typeof navigator !== "undefined" ? navigator.userAgent : "unknown";
  return {
    isTeslaBrowser: isTeslaBrowserUserAgent(userAgent),
    userAgent,
    debugEnabled: isTeslaDebugEnabled(),
  };
}
