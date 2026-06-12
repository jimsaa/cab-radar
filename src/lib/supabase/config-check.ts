/** Known placeholder / invalid hostnames — real refs look like `abcdefghijklmnop.supabase.co` */
const INVALID_HOSTS = new Set(["cab-radar.supabase.co", "xxx.supabase.co"]);

export const SUPABASE_CONFIG_ERROR =
  "Supabase är felkonfigurerad. Sätt NEXT_PUBLIC_SUPABASE_URL till Project URL från Supabase Dashboard → Settings → API (t.ex. https://abcdefgh.supabase.co).";

export function getSupabaseConfigError(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    return "NEXT_PUBLIC_SUPABASE_URL saknas i .env.local.";
  }

  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return "NEXT_PUBLIC_SUPABASE_URL är ogiltig.";
  }

  if (!hostname.endsWith(".supabase.co")) {
    return SUPABASE_CONFIG_ERROR;
  }

  if (INVALID_HOSTS.has(hostname)) {
    return SUPABASE_CONFIG_ERROR;
  }

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) {
    return "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY saknas i .env.local.";
  }

  const secret =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    return "SUPABASE_SECRET_KEY saknas i .env.local (krävs för registrering).";
  }

  return null;
}

export function isSupabaseConnectionError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("fetch failed") ||
    lower.includes("enotfound") ||
    lower.includes("network") ||
    lower.includes("econnrefused") ||
    lower.includes("getaddrinfo") ||
    lower.includes("matchar fj") ||
    lower.includes("could not resolve")
  );
}

export const SUPABASE_KEY_MISMATCH_ERROR =
  "Supabase-nycklarna matchar inte projektet. Kopiera Publishable key och Secret key från samma projekt som Project URL (Dashboard → Settings → API).";

export function translateSupabaseAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("unregistered api key") || lower.includes("invalid api key")) {
    return SUPABASE_KEY_MISMATCH_ERROR;
  }
  if (isSupabaseConnectionError(lower)) {
    return "Det gick inte att ansluta till servern.";
  }
  if (lower.includes("already") || lower.includes("registered")) {
    return "E-postadressen är redan registrerad.";
  }
  if (lower.includes("password") && lower.includes("least")) {
    return "Lösenordet måste vara minst 6 tecken.";
  }
  if (lower.includes("invalid email")) {
    return "Ange en giltig e-postadress.";
  }

  return "Det gick inte att skapa kontot.";
}
