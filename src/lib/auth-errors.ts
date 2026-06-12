export function translateAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("unregistered api key") || lower.includes("invalid api key")) {
    return "Supabase-nycklarna matchar inte projektet. Kontrollera .env.local.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Fel e-post eller lösenord.";
  }
  if (lower.includes("email not confirmed")) {
    return "Bekräfta din e-post innan du loggar in.";
  }
  if (
    lower.includes("secure") ||
    lower.includes("ssl") ||
    lower.includes("certificate")
  ) {
    return "Webbläsaren blockerar anslutningen. Använd http:// (inte https) till din dators IP-adress.";
  }
  if (lower.includes("user already registered")) {
    return "E-postadressen är redan registrerad.";
  }
  if (lower.includes("password") && lower.includes("least")) {
    return "Lösenordet måste vara minst 6 tecken.";
  }
  if (lower.includes("rate limit")) {
    return "För många försök. Vänta en stund och försök igen.";
  }
  if (
    lower.includes("fetch failed") ||
    lower.includes("network") ||
    lower.includes("failed to fetch") ||
    lower.includes("unregistered api key") ||
    lower.includes("invalid api key")
  ) {
    return "Det gick inte att ansluta till servern.";
  }

  return "Fel e-post eller lösenord.";
}
