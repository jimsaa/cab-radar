import Link from "next/link";
import {
  CABRADAR_GUIDE_INTRO,
  CABRADAR_GUIDE_SECTIONS,
  CABRADAR_GUIDE_SUBTAGLINE,
  CABRADAR_GUIDE_TAGLINE,
  CABRADAR_GUIDE_TITLE,
  CIVILKOLL_GUIDE_DISCLAIMER,
  CIVILKOLL_GUIDE_RESULTS,
  type GuideSection,
  type GuideSubsection,
} from "@/lib/cabradar-guide";
import { ReportTypeIcon } from "@/components/icons/ReportTypeIcon";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function SubsectionBlock({ subsection }: { subsection: GuideSubsection }) {
  return (
    <div className="rounded-xl border border-card-border/80 bg-background/40 p-3">
      <h4 className="flex items-center gap-2 font-semibold">
        {subsection.title === "Laser" ? (
          <ReportTypeIcon type="laser" variant="badge" />
        ) : subsection.icon ? (
          <span aria-hidden>{subsection.icon}</span>
        ) : null}
        {subsection.title}
      </h4>
      {subsection.body && (
        <p className="mt-1 text-sm leading-relaxed text-foreground/90">
          {subsection.body}
        </p>
      )}
      {subsection.bullets && <BulletList items={subsection.bullets} />}
      {subsection.note && (
        <p className="mt-2 text-xs font-medium text-muted">{subsection.note}</p>
      )}
    </div>
  );
}

function GuideSectionBlock({ section }: { section: GuideSection }) {
  return (
    <section
      id={section.id}
      className="scroll-mt-24 rounded-2xl border border-card-border bg-card p-4"
    >
      <h2 className="text-lg font-bold">
        {section.icon ? `${section.icon} ` : ""}
        {section.title}
      </h2>

      {section.intro && (
        <p className="mt-2 text-sm leading-relaxed text-foreground/90">
          {section.intro}
        </p>
      )}

      {section.bullets && <BulletList items={section.bullets} />}

      {section.subsections && section.subsections.length > 0 && (
        <div className="mt-3 space-y-2">
          {section.subsections.map((sub) => (
            <SubsectionBlock key={sub.title} subsection={sub} />
          ))}
        </div>
      )}

      {section.id === "civilkoll" && (
        <div className="mt-3 space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Resultat
          </h3>
          {CIVILKOLL_GUIDE_RESULTS.map((result) => (
            <div
              key={result.title}
              className="rounded-xl border border-card-border/80 bg-background/40 p-3"
            >
              <p className="font-semibold">
                {result.icon} {result.title}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">
                {result.body}
              </p>
            </div>
          ))}
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-relaxed text-amber-100">
            <span className="font-semibold">Viktigt:</span>{" "}
            {CIVILKOLL_GUIDE_DISCLAIMER}
          </p>
        </div>
      )}

      {section.callouts?.map((callout) => (
        <p
          key={callout.text}
          className={cn(
            "mt-3 rounded-xl px-3 py-2 text-sm font-semibold leading-relaxed",
            callout.emphasis
              ? "border border-danger/40 bg-danger/15 text-danger"
              : "border border-card-border bg-background/40 text-foreground"
          )}
        >
          {callout.text}
        </p>
      ))}

      {section.footer && (
        <p className="mt-3 text-sm text-muted leading-relaxed">{section.footer}</p>
      )}
    </section>
  );
}

export function CabRadarGuideView() {
  return (
    <article className="safe-bottom pb-8">
      <Link
        href="/help"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent-bright"
      >
        <ArrowLeft className="h-4 w-4" />
        Tillbaka till Hjälp
      </Link>

      <header className="mb-6 rounded-2xl border border-accent/30 bg-accent/10 p-5">
        <h1 className="text-xl font-bold leading-snug">{CABRADAR_GUIDE_TITLE}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Välkommen till CabRadar.
        </p>
        <p className="mt-2 text-sm leading-relaxed">{CABRADAR_GUIDE_INTRO}</p>
      </header>

      <nav
        aria-label="Innehåll"
        className="mb-6 rounded-2xl border border-card-border bg-card p-4"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Innehåll
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {CABRADAR_GUIDE_SECTIONS.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="inline-block rounded-lg border border-card-border bg-background/50 px-2.5 py-1 text-xs font-medium hover:border-accent/40"
              >
                {section.icon ? `${section.icon} ` : ""}
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-4">
        {CABRADAR_GUIDE_SECTIONS.map((section) => (
          <GuideSectionBlock key={section.id} section={section} />
        ))}
      </div>

      <footer className="mt-8 rounded-2xl border border-card-border bg-card p-5 text-center">
        <p className="text-base font-bold">{CABRADAR_GUIDE_TAGLINE}</p>
        <p className="mt-1 text-sm text-muted">{CABRADAR_GUIDE_SUBTAGLINE}</p>
      </footer>
    </article>
  );
}
