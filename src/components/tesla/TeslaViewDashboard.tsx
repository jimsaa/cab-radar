const PLACEHOLDER_SECTIONS = [
  {
    title: "LIVE Reports",
    description: "Real-time driver reports and alerts will appear here.",
  },
  {
    title: "GSI Landvetter",
    description: "Quick access to Landvetter taxi queue status.",
  },
  {
    title: "SJ Ankomster",
    description: "One-tap link to Göteborg C train arrivals.",
  },
  {
    title: "Driver Information",
    description: "Your profile, status, and network info.",
  },
] as const;

export function TeslaViewDashboard() {
  return (
    <div className="mx-auto min-h-[calc(100dvh-72px)] max-w-6xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Tesla View
        </h1>
        <p className="mt-2 text-lg text-[#B0B6BE]">
          Driver-focused command center
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {PLACEHOLDER_SECTIONS.map((section) => (
          <section
            key={section.title}
            className="rounded-[18px] border border-[#3A4048] bg-[#262B31] p-6"
          >
            <h2 className="text-lg font-bold text-white">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#8A9099]">
              {section.description}
            </p>
            <p className="mt-4 rounded-[12px] border border-dashed border-[#3A4048] bg-[#1B1E22]/60 px-4 py-8 text-center text-sm text-[#6B7280]">
              Placeholder — under utveckling
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
