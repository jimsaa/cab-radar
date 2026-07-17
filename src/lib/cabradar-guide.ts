import { QUEUE_TRAFFIC_ICON } from "./alert-types";

/** CabRadar – Hjälp & guider (driver guide content). */

export const CABRADAR_GUIDE_TITLE = "CabRadar – Hjälp & guider";

export const CABRADAR_GUIDE_INTRO =
  "CabRadar är utvecklad av taxiförare för taxiförare med målet att göra arbetsdagen tryggare, smartare och mer effektiv.";

export interface GuideSubsection {
  title: string;
  icon?: string;
  body?: string;
  bullets?: string[];
  note?: string;
}

export interface GuideSection {
  id: string;
  title: string;
  icon?: string;
  intro?: string;
  bullets?: string[];
  subsections?: GuideSubsection[];
  callouts?: { emphasis?: boolean; text: string }[];
  footer?: string;
}

export const CABRADAR_GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "radar",
    title: "Radar",
    intro:
      "På startsidan kan du snabbt rapportera händelser som påverkar andra förare. Rapporteringen är utformad för att ta så få tryck som möjligt. När du trycker på en knapp hämtas din position automatiskt.",
    subsections: [
      {
        title: "Laser",
        icon: "",
        body: "Används när du observerar:",
        bullets: [
          "Laserkontroll",
          "Hastighetskamera med laser",
          "Polis med laserutrustning",
        ],
        note: "Rapportera endast sådant du själv observerat.",
      },
      {
        title: "Taxikontroll",
        icon: "🚕",
        body: "Används vid:",
        bullets: [
          "Taxikontroller",
          "Kontrollplatser",
          "Polisens fordonskontroller",
          "Andra myndighetskontroller som påverkar taxiförare",
        ],
      },
      {
        title: "Bilar behövs",
        body: "Används när det är högt taxibehov på en plats, till exempel:",
        bullets: [
          "Landvetter, Stena Line eller andra terminaler",
          "Scandinavium, Ullevi, Liseberg, Gothia Towers",
          "Efter konserter, matcher eller evenemang",
        ],
        note: "Du kan lägga till en valfri kommentar, t.ex. varför behovet är stort.",
      },
      {
        title: "Stopp",
        icon: "🚧",
        body: "Används när vägen är blockerad eller trafiken står still. Exempel:",
        bullets: ["Vägarbete", "Avstängning", "Totalstopp", "Oframkomlig väg"],
      },
      {
        title: "Kö",
        icon: QUEUE_TRAFFIC_ICON,
        body: "Används vid:",
        bullets: ["Trafikstockning", "Långsam trafik", "Tillfälliga köer"],
      },
      {
        title: "Olycka",
        icon: "🚑",
        body: "Används vid:",
        bullets: [
          "Trafikolyckor",
          "Incidenter",
          "Händelser som påverkar trafiksäkerheten",
        ],
      },
    ],
  },
  {
    id: "taxi-i-nod",
    title: "Taxi i nöd",
    icon: "🆘",
    intro:
      "Taxi i nöd är CabRadars trygghetsfunktion. Den är avsedd för situationer där du behöver hjälp eller känner dig otrygg.",
    bullets: [
      "Hotfull situation",
      "Pågående konflikt",
      "Rån",
      "Misstanke om frihetsberövande",
      "Situationer där du inte känner dig säker",
    ],
    subsections: [
      {
        title: "Viktigt att känna till",
        body: "När Taxi i nöd aktiveras:",
        bullets: [
          "Din aktuella position delas.",
          "Administratörer informeras.",
          "Behöriga Co-admins kan informeras.",
          "Andra förare kan få information om var hjälp behövs.",
        ],
      },
      {
        title: "Telefonnummer",
        body: "Telefonnummer delas endast med administratörer och behöriga Co-admins vid Taxi i nöd-larm. Vanliga användare kan aldrig se dina kontaktuppgifter.",
      },
      {
        title: "Närma dig varsamt",
        body: "Om du får information om ett Taxi i nöd-larm:",
        bullets: [
          "Närma dig situationen försiktigt.",
          "Utsätt aldrig dig själv för fara.",
          "Försök inte ingripa fysiskt.",
        ],
      },
      {
        title: "Ingen automatisk avslutning",
        body: "Taxi i nöd avslutas inte automatiskt. Larmet ligger kvar tills föraren själv markerar ”Jag är OK”, eller administratör avslutar larmet. Detta är av säkerhetsskäl.",
      },
      {
        title: "CabRadars ansvar",
        body: "CabRadar är ett hjälpmedel och ersätter inte polis, räddningstjänst eller SOS Alarm. CabRadar kan inte garantera att hjälp finns i närheten eller att ett larm uppmärksammas omedelbart.",
      },
    ],
    callouts: [
      { emphasis: true, text: "Vid misstanke om brott eller allvarlig fara: Ring alltid 112." },
      { emphasis: true, text: "Vid akut fara: Ring alltid 112 om det är möjligt." },
    ],
  },
  {
    id: "civilkoll",
    title: "Civilkoll",
    icon: "🔍",
    intro: "Civilkoll är CabRadars interna observationsregister. Databasen byggs upp genom:",
    bullets: [
      "Rapporter från taxiförare",
      "Administratörers erfarenheter",
      "Granskade observationer",
    ],
    footer: "Alla poster granskas innan de blir sökbara.",
  },
  {
    id: "erbjudanden",
    title: "Erbjudanden",
    icon: "🎁",
    intro:
      "Här visas erbjudanden och rabatter som kan vara relevanta för taxiförare. Endast administratörer kan publicera erbjudanden.",
  },
  {
    id: "support",
    title: "Support",
    icon: "💬",
    intro:
      "Har du frågor eller problem? Kontakta oss via Support-funktionen i appen. Vi försöker återkomma så snart som möjligt.",
  },
  {
    id: "partner",
    title: "Samarbetspartner",
    icon: "🤝",
    intro:
      "Företag som vill samarbeta med CabRadar kan kontakta oss via samarbetsformuläret i appen. Exempel:",
    bullets: ["Rabatter", "Samarbeten", "Tjänster för taxiförare"],
  },
  {
    id: "medlemskap",
    title: "Medlemskap",
    icon: "👑",
    intro: "CabRadar bygger på att förare hjälper varandra. Aktiva förare får fortsatt tillgång till premiumfunktioner genom att bidra till nätverket. Om du blir inaktiv:",
    bullets: [
      "Du kan fortfarande logga in om du blir inaktiv.",
      "Du kan fortfarande rapportera.",
      "Du kan återfå full tillgång genom att bli aktiv igen.",
    ],
  },
  {
    id: "beta",
    title: "Betatest",
    icon: "🧪",
    intro:
      "Under betatestperioden kan vissa användare ha utökad tillgång. Funktioner kan förändras och förbättras innan den officiella lanseringen.",
  },
];

/** Civilkoll result cards — rendered separately in guide view. */
export const CIVILKOLL_GUIDE_RESULTS = [
  {
    icon: "🟢",
    title: "KÄND CIVIL",
    body: "Registreringsnumret finns i CabRadars observationsregister. Var uppmärksam och gör alltid en egen bedömning.",
  },
  {
    icon: "⚪",
    title: "EJ KÄND",
    body: "Inga observationer finns registrerade. Du kan skicka in registreringsnumret för granskning.",
  },
] as const;

export const CIVILKOLL_GUIDE_DISCLAIMER =
  "Civilkoll är inte ett officiellt register. Informationen bygger på observationer och ska endast användas som vägledning. CabRadar lämnar inga garantier för att informationen är korrekt eller aktuell.";

export const CABRADAR_GUIDE_TAGLINE = "Av taxiförare. För taxiförare.";
export const CABRADAR_GUIDE_SUBTAGLINE =
  "Den digitala co-piloten för taxiförare.";
