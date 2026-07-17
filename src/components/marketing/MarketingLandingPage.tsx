"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { PartnerModal } from "@/components/communication/PartnerModal";
import { APP_NAME } from "@/lib/constants";

const FEATURES = [
  {
    icon: "🚔",
    title: "Taxikontroll",
    body: "See reported taxi inspections.",
  },
  {
    icon: "🚗",
    title: "Kontroll av alla fordon",
    body: "Know when police are checking every vehicle.",
  },
  {
    icon: "🚦",
    title: "Kö",
    body: "Avoid long queues.",
  },
  {
    icon: "🚨",
    title: "Olycka",
    body: "Traffic accidents.",
  },
  {
    icon: "🆘",
    title: "Taxi i nöd",
    body: "Emergency support.",
  },
  {
    icon: "🚖",
    title: "Bilar behövs",
    body: "See where demand is high.",
  },
  {
    icon: "🔎",
    title: "CivilKoll",
    body: "Check suspicious vehicles.",
  },
] as const;

const WHY = [
  "Free for all taxi drivers",
  "Built in Sweden",
  "Tesla View",
  "Tablet View",
  "Mobile View",
  "Community driven",
  "Live updates",
  "Privacy focused",
] as const;

const ROADMAP = [
  "Premium Bookings",
  "Premium Concierge",
  "Partner Deals",
  "Tesla Network",
  "Hotel Network",
] as const;

export function MarketingLandingPage() {
  const signupRef = useRef<HTMLDivElement>(null);
  const [partnerOpen, setPartnerOpen] = useState(false);

  function scrollToSignup() {
    signupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#05080f] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(30,136,229,0.35),transparent_55%),radial-gradient(ellipse_60%_40%_at_90%_20%,rgba(66,165,245,0.12),transparent_50%),linear-gradient(180deg,#05080f_0%,#0a1628_40%,#05080f_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10">
        {/* Hero */}
        <section className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col items-center justify-center px-5 pb-16 pt-20 text-center sm:px-8">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.35em] text-sky-300/80">
            Sweden · Taxi Intelligence
          </p>
          <h1 className="font-[family-name:var(--font-landing-display)] text-5xl font-semibold tracking-tight text-white sm:text-7xl">
            {APP_NAME}
          </h1>
          <p className="mt-4 max-w-xl font-[family-name:var(--font-landing-display)] text-xl font-medium leading-snug text-sky-100/95 sm:text-3xl">
            The digital co-pilot for taxi drivers.
          </p>
          <p className="mt-6 max-w-lg text-sm leading-relaxed text-slate-300 sm:text-base">
            Real-time traffic intelligence. CivilKoll. Taxi controls. Queues.
            Emergency assistance. High demand alerts. Built by taxi drivers for
            taxi drivers.
          </p>
          <div className="mt-10 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={scrollToSignup}
              className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-white px-8 text-base font-semibold text-[#05080f] transition hover:bg-sky-100 active:scale-[0.98]"
            >
              Kom igång gratis
            </button>
            <Link
              href="/login"
              className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-white/20 bg-white/5 px-8 text-base font-medium text-white backdrop-blur transition hover:border-white/40 hover:bg-white/10"
            >
              Logga in
            </Link>
          </div>
          <div ref={signupRef} className="mt-6 scroll-mt-24">
            <Link
              href="/signup"
              className="text-sm font-medium text-sky-300 underline-offset-4 hover:underline"
            >
              Registrera gratis →
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-5xl px-5 py-16 sm:px-8">
          <h2 className="text-center font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
            How CabRadar helps you every workday.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <article
                key={f.title}
                className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur transition duration-300 hover:border-sky-400/40 hover:bg-white/[0.06]"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className="text-2xl" aria-hidden>
                  {f.icon}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                  {f.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Why */}
        <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
          <h2 className="text-center font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
            Why CabRadar?
          </h2>
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {WHY.map((item) => (
              <li
                key={item}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-gradient-to-r from-sky-500/10 to-transparent px-4 py-3 text-sm font-medium text-slate-200"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Roadmap */}
        <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
          <h2 className="text-center font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
            Future roadmap
          </h2>
          <p className="mt-3 text-center text-sm text-slate-400">
            Premium services coming later — CabRadar stays free for drivers.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {ROADMAP.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-300"
              >
                {item}
              </span>
            ))}
          </div>
        </section>

        {/* Advertiser */}
        <section className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
          <div className="overflow-hidden rounded-3xl border border-sky-400/30 bg-gradient-to-br from-sky-500/20 via-[#0d1b2e] to-[#05080f] p-8 text-center shadow-[0_0_60px_rgba(30,136,229,0.15)]">
            <h2 className="font-[family-name:var(--font-landing-display)] text-2xl font-semibold sm:text-3xl">
              Vill du synas här?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
              Nå tusentals taxiförare varje vecka genom CabRadar.
            </p>
            <button
              type="button"
              onClick={() => setPartnerOpen(true)}
              className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full bg-sky-500 px-8 text-sm font-semibold text-white transition hover:bg-sky-400 active:scale-[0.98]"
            >
              Kontakta oss
            </button>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="mx-auto max-w-3xl px-5 pb-24 pt-10 text-center sm:px-8">
          <h2 className="font-[family-name:var(--font-landing-display)] text-4xl font-semibold tracking-tight sm:text-5xl">
            Ready to join?
          </h2>
          <Link
            href="/signup"
            className="mt-8 inline-flex min-h-[56px] items-center justify-center rounded-full bg-white px-10 text-base font-semibold text-[#05080f] transition hover:bg-sky-100 active:scale-[0.98]"
          >
            Registrera gratis
          </Link>
          <p className="mt-6 text-xs text-slate-500">
            Already have an account?{" "}
            <Link href="/login" className="text-sky-400 hover:underline">
              Logga in
            </Link>
          </p>
        </section>
      </div>

      <PartnerModal open={partnerOpen} onClose={() => setPartnerOpen(false)} />
    </div>
  );
}
