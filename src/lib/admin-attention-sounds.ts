/** Subtle dispatch sounds for Tesla admin dashboard — never loop. */

function playTone(
  frequencies: number[],
  durationSec: number,
  peakGain: number,
  type: OscillatorType = "sine"
): void {
  if (typeof window === "undefined") return;

  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.value = peakGain;

    const step = durationSec / frequencies.length;
    frequencies.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.connect(gain);
      const start = ctx.currentTime + index * step;
      const end = start + step * 0.92;
      osc.start(start);
      osc.stop(end);
    });

    gain.gain.setValueAtTime(peakGain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + durationSec
    );

    window.setTimeout(() => void ctx.close(), (durationSec + 0.2) * 1000);
  } catch {
    // Audio unavailable in browser.
  }
}

/** Short low-volume tick for new live reports. */
export function playAdminReportTick(): void {
  playTone([920, 740], 0.12, 0.06, "triangle");
}

/** Stronger two-tone alert for Taxi i nöd. */
export function playAdminEmergencyAlert(): void {
  playTone([660, 880, 660], 0.55, 0.14, "square");
}
