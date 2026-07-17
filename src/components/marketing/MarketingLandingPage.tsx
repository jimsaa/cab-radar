"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { PartnerModal } from "@/components/communication/PartnerModal";
import { APP_NAME } from "@/lib/constants";

const FEATURES = [
  {
    icon: "🚕",
    title: "Taxikontroll",
    body: "Se rapporterade taxikontroller i realtid.",
  },
  {
    icon: "🚓",
    title: "Kontroll av alla fordon",
    body: "Undvik stora fordonskontroller.",
  },
  {
    icon: "🚖",
    title: "Bilar behövs",
    body: "Se var efterfrågan är hög.",
  },
  {
    icon: "🚧",
    title: "Kö",
    body: "Undvik köer.",
  },
  {
    icon: "🚑",
    title: "Olycka",
    body: "Få information direkt.",
  },
  {
    icon: "🆘",
    title: "Taxi i nöd",
    body: "Larma andra förare.",
  },
  {
    icon: "🔍",
    title: "CivilKoll",
    body: "Kontrollera fordon snabbt.",
  },
] as const;

const WHY = [
  "Gratis att använda",
  "Byggd i Sverige",
  "Tesla View",
  "Surfplatta",
  "Mobil",
  "Live-information",
  "Integritet i fokus",
  "Gemenskap mellan förare",
] as const;

const ROADMAP = [
  {
    title: "Premiumbokningar",
    body: "Bokningar och uppdrag direkt till dig.",
  },
  {
    title: "Partnererbjudanden",
    body: "Rabatter och deals för taxiförare.",
  },
  {
    title: "Hotellnätverk",
    body: "Koppling till hotell och pickup-punkter.",
  },
  {
    title: "Premium Concierge",
    body: "Premiumtjänster för dig och dina kunder.",
  },
  {
    title: "Tesla Network",
    body: "Nätverk för Tesla-taxiförare.",
  },
] as const;

export function MarketingLandingPage() {
  const [partnerOpen, setPartnerOpen] = useState(false);

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[#05080f] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-5%,rgba(30,136,229,0.32),transparent_55%),radial-gradient(ellipse_50%_35%_at_85%_15%,rgba(66,165,245,0.1),transparent_50%),linear-gradient(180deg,#05080f_0%,#0a1628_45%,#05080f_100%)]"
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
        {/* Hero */}
        <section className="flex flex-col items-center px-1 pb-8 pt-10 text-center sm:pb-10 sm:pt-12">
          <div className="relative mb-5">
            <div
              aria-hidden
              className="absolute -inset-4 rounded-[2rem] bg-sky-500/20 blur-2xl"
            />
            <Image
              src="/logo.png"
              alt={APP_NAME}
              width={112}
              height={112}
              className="relative h-24 w-24 rounded-3xl shadow-[0_0_40px_rgba(30,136,229,0.35)] sm:h-28 sm:w-28"
              priority
            />
          </div>

          <h1 className="sr-only">{APP_NAME}</h1>
          <p className="max-w-md font-[family-name:var(--font-landing-display)] text-xl font-semibold leading-snug tracking-tight text-white sm:text-2xl md:text-3xl">
            Den digitala co-piloten för taxiförare.
          </p>

          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-300 sm:max-w-md sm:text-[15px]">
            Rapporter i realtid. CivilKoll. Taxikontroller. Köer. Olyckor. Fler
            kunder. Allt på ett ställe.
          </p>

          <div className="mt-6 flex w-full max-w-sm flex-col gap-2.5 sm:max-w-md sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-full bg-[#1e88e5] px-6 text-sm font-semibold text-white shadow-[0_0_24px_rgba(30,136,229,0.35)] transition hover:bg-[#42a5f5] active:scale-[0.98] sm:flex-none sm:px-8"
            >
              Kom igång gratis
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-full border border-white/20 bg-white/5 px-6 text-sm font-medium text-white backdrop-blur transition hover:border-sky-400/40 hover:bg-white/10 active:scale-[0.98] sm:flex-none sm:px-8"
            >
              Logga in
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="pb-8 pt-2 sm:pb-10">
          <h2 className="text-center font-[family-name:var(--font-landing-display)] text-xl font-semibold tracking-tight sm:text-2xl">
            Allt du behöver under arbetspasset
          </h2>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-3">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 shadow-[0_0_0_1px_rgba(30,136,229,0.04)] transition hover:border-sky-400/35 hover:bg-white/[0.07] sm:p-4"
              >
                <span className="text-2xl leading-none" aria-hidden>
                  {f.icon}
                </span>
                <h3 className="mt-2 text-[15px] font-semibold text-white">
                  {f.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">
                  {f.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Why */}
        <section className="pb-8 pt-2 sm:pb-10">
          <h2 className="text-center font-[family-name:var(--font-landing-display)] text-xl font-semibold tracking-tight sm:text-2xl">
            Varför välja CabRadar?
          </h2>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {WHY.map((item) => (
              <li
                key={item}
                className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-gradient-to-r from-sky-500/12 to-transparent px-3.5 py-2.5 text-sm font-medium text-slate-100"
              >
                <span className="text-base text-sky-400" aria-hidden>
                  ✅
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Roadmap */}
        <section className="pb-8 pt-2 sm:pb-10">
          <h2 className="text-center font-[family-name:var(--font-landing-display)] text-xl font-semibold tracking-tight sm:text-2xl">
            Detta kommer snart
          </h2>
          <p className="mt-2 text-center text-xs text-slate-400 sm:text-sm">
            Premiumtjänster längre fram — CabRadar förblir gratis för förare.
          </p>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {ROADMAP.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-sky-400/20 bg-gradient-to-b from-sky-500/10 to-white/[0.02] p-3.5 sm:p-4"
              >
                <h3 className="text-sm font-semibold text-sky-100">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {item.body}
                </p>
              </article>
            ))}
            <article className="flex items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-3.5 sm:col-span-2 lg:col-span-1">
              <p className="text-sm font-medium text-slate-400">
                Och mycket mer…
              </p>
            </article>
          </div>
        </section>

        {/* Advertiser */}
        <section className="pb-8 pt-2 sm:pb-10">
          <div className="overflow-hidden rounded-2xl border border-sky-400/30 bg-gradient-to-br from-sky-500/20 via-[#0d1b2e] to-[#05080f] px-5 py-6 text-center shadow-[0_0_40px_rgba(30,136,229,0.12)] sm:px-8 sm:py-7">
            <h2 className="font-[family-name:var(--font-landing-display)] text-xl font-semibold sm:text-2xl">
              Vill du synas här?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Nå tusentals taxiförare varje vecka genom CabRadar.
            </p>
            <button
              type="button"
              onClick={() => setPartnerOpen(true)}
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#1e88e5] px-7 text-sm font-semibold text-white transition hover:bg-[#42a5f5] active:scale-[0.98]"
            >
              Kontakta oss
            </button>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="pb-14 pt-2 text-center sm:pb-16">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 sm:px-8 sm:py-10">
            <h2 className="font-[family-name:var(--font-landing-display)] text-2xl font-semibold tracking-tight sm:text-3xl">
              Redo att komma igång?
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-300">
              Registrera dig gratis och börja använda CabRadar direkt.
            </p>
            <Link
              href="/signup"
              className="mt-5 inline-flex min-h-[48px] items-center justify-center rounded-full bg-white px-8 text-sm font-semibold text-[#05080f] transition hover:bg-sky-100 active:scale-[0.98]"
            >
              Registrera gratis
            </Link>
            <p className="mt-4 text-xs text-slate-500">
              Har du redan konto?{" "}
              <Link href="/login" className="text-sky-400 hover:underline">
                Logga in
              </Link>
            </p>
          </div>
        </section>
      </div>

      <PartnerModal open={partnerOpen} onClose={() => setPartnerOpen(false)} />
    </div>
  );
}
