import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getSupabaseUrl } from "@/lib/supabase/env";
import {
  getSupabaseConfigError,
  isSupabaseConnectionError,
  translateSupabaseAuthError,
} from "@/lib/supabase/config-check";
import {
  isValidLicence,
  LICENCE_DUPLICATE_MESSAGE,
  LICENCE_INVALID_MESSAGE,
  normalizeLicenceInput,
} from "@/lib/licence.shared";
import { hashLicence } from "@/lib/licence.server";
import {
  findDuplicateLicence,
  licenceProfileFields,
  profileHasLicenceHashColumn,
} from "@/lib/signup-profile";
import {
  isNicknameConflictError,
  NICKNAME_TAKEN_MESSAGE,
  normalizeNickname,
  validateNickname,
} from "@/lib/driver-nickname";

interface TeslaBetaSignupBody {
  email?: string;
  password?: string;
  displayName?: string;
  nickname?: string;
  driverLicenseNumber?: string;
  taxiNumber?: string;
}

const TESLA_BETA_CITY = "Göteborg";

const TESLA_BETA_SCHEMA_ERROR =
  "Tesla Beta-kolumner saknas i databasen. Kör migration-tesla-beta.sql i Supabase SQL Editor.";

const TESLA_BETA_CACHE_ERROR =
  "Tesla Beta-kolumner finns i databasen men API-cachen är inte uppdaterad. Kör i Supabase SQL Editor: NOTIFY pgrst, 'reload schema'; och försök igen om en minut.";

function supabaseProjectRef(): string {
  try {
    return new URL(getSupabaseUrl()).hostname.split(".")[0] ?? "unknown";
  } catch {
    return "unknown";
  }
}

function isPostgrestSchemaCacheError(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST204") return true;
  return (error.message ?? "").toLowerCase().includes("schema cache");
}

function isPostgresMissingColumnError(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  if (error.code === "42703") return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes("does not exist") && !msg.includes("schema cache");
}

function isTeslaBetaSchemaError(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  if (isPostgresMissingColumnError(error)) return true;
  if (error.code === "22P02") return true;
  const msg = (error.message ?? "").toLowerCase();
  return msg.includes("tesla_beta") || msg.includes("membership_type");
}

export async function probeTeslaBetaSchema(
  service: Awaited<ReturnType<typeof createServiceClient>>
): Promise<{ ok: boolean; projectRef: string; detail?: string }> {
  const projectRef = supabaseProjectRef();

  for (let attempt = 0; attempt < 4; attempt++) {
    const column = await service.from("profiles").select("tesla_beta").limit(1);
    if (!column.error) {
      const enumCheck = await service
        .from("profiles")
        .select("id")
        .eq("membership_type", "tesla_beta")
        .limit(0);

      if (enumCheck.error?.code === "22P02") {
        return {
          ok: false,
          projectRef,
          detail: "membership_type enum saknar värdet tesla_beta",
        };
      }
      if (enumCheck.error && !isPostgrestSchemaCacheError(enumCheck.error)) {
        return { ok: false, projectRef, detail: enumCheck.error.message };
      }
      return { ok: true, projectRef };
    }

    if (isPostgrestSchemaCacheError(column.error)) {
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 750 * (attempt + 1)));
        continue;
      }
      return { ok: false, projectRef, detail: "postgrest_schema_cache" };
    }

    if (isPostgresMissingColumnError(column.error)) {
      return { ok: false, projectRef, detail: "tesla_beta column missing" };
    }

    return { ok: false, projectRef, detail: column.error.message };
  }

  return { ok: false, projectRef, detail: "schema_probe_failed" };
}

async function assertTeslaBetaSchema(
  service: Awaited<ReturnType<typeof createServiceClient>>
): Promise<string | null> {
  const probe = await probeTeslaBetaSchema(service);
  if (probe.ok) return null;

  if (probe.detail === "postgrest_schema_cache") {
    return TESLA_BETA_CACHE_ERROR;
  }

  return `${TESLA_BETA_SCHEMA_ERROR} (Supabase-projekt: ${probe.projectRef})`;
}

/** Diagnostic — open in browser to verify production DB matches your migration. */
export async function GET() {
  const configError = getSupabaseConfigError();
  if (configError) {
    return NextResponse.json({ ok: false, error: configError }, { status: 503 });
  }

  try {
    const service = await createServiceClient();
    const probe = await probeTeslaBetaSchema(service);
    return NextResponse.json(probe);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.log("[AUTH] Tesla Beta signup started");

  const configError = getSupabaseConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  let body: TeslaBetaSignupBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Ett oväntat fel uppstod. Försök igen." },
      { status: 400 }
    );
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const displayName = body.displayName?.trim();
  const nicknameRaw = body.nickname?.trim();
  const taxiNumber = body.taxiNumber?.trim() || null;
  const licence = normalizeLicenceInput(body.driverLicenseNumber ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "E-post och lösenord krävs." },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Lösenordet måste vara minst 6 tecken." },
      { status: 400 }
    );
  }

  if (!displayName || displayName.length < 2) {
    return NextResponse.json({ error: "Namn krävs." }, { status: 400 });
  }

  if (!isValidLicence(licence)) {
    return NextResponse.json({ error: LICENCE_INVALID_MESSAGE }, { status: 400 });
  }

  const nicknameError = validateNickname(nicknameRaw ?? "");
  if (nicknameError) {
    return NextResponse.json({ error: nicknameError }, { status: 400 });
  }
  const nickname = normalizeNickname(nicknameRaw ?? "");

  if (!process.env.LICENCE_HASH_SECRET) {
    return NextResponse.json(
      { error: "Ett oväntat fel uppstod. Försök igen." },
      { status: 503 }
    );
  }

  let licenceHash: string;
  try {
    licenceHash = hashLicence(licence);
  } catch {
    return NextResponse.json(
      { error: "Ett oväntat fel uppstod. Försök igen." },
      { status: 503 }
    );
  }

  try {
    const service = await createServiceClient();

    const schemaError = await assertTeslaBetaSchema(service);
    if (schemaError) {
      return NextResponse.json({ error: schemaError }, { status: 503 });
    }

    const useHashColumn = await profileHasLicenceHashColumn(service);
    const licenceFields = licenceProfileFields(licence, licenceHash, useHashColumn);

    if (await findDuplicateLicence(service, licence, licenceHash, useHashColumn)) {
      return NextResponse.json({ error: LICENCE_DUPLICATE_MESSAGE }, { status: 409 });
    }

    const { data: nicknameTaken } = await service
      .from("profiles")
      .select("id")
      .ilike("nickname", nickname)
      .maybeSingle();

    if (nicknameTaken) {
      return NextResponse.json({ error: NICKNAME_TAKEN_MESSAGE }, { status: 409 });
    }

    const { data: authData, error: authError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        nickname,
      },
    });

    if (authError || !authData.user) {
      const msg = authError?.message ?? "unknown auth error";
      if (isSupabaseConnectionError(msg)) {
        return NextResponse.json(
          { error: "Det gick inte att ansluta till servern." },
          { status: 503 }
        );
      }
      if (msg.toLowerCase().includes("already")) {
        return NextResponse.json(
          { error: "E-postadressen är redan registrerad." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: translateSupabaseAuthError(msg) },
        { status: 400 }
      );
    }

    const userId = authData.user.id;
    const teslaBetaFields = {
      ...licenceFields,
      nickname,
      display_name: displayName,
      driver_city: TESLA_BETA_CITY,
      taxi_company_name: "Tesla Beta",
      ...(taxiNumber ? { taxi_number: taxiNumber } : {}),
      verification_status: "verified",
      membership_type: "tesla_beta",
      tesla_beta: true,
      beta_user: true,
      test_mode_enabled: true,
      tesla_view_enabled: true,
      preferred_view: "tesla",
      welcome_pending: false,
      updated_at: new Date().toISOString(),
    };

    let profileSaved = false;

    for (let attempt = 0; attempt < 8; attempt++) {
      const { data: profile } = await service
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (profile) {
        const { error: profileError } = await service
          .from("profiles")
          .update(teslaBetaFields)
          .eq("id", userId);

        if (profileError) {
          if (isTeslaBetaSchemaError(profileError)) {
            await service.auth.admin.deleteUser(userId);
            return NextResponse.json({ error: TESLA_BETA_SCHEMA_ERROR }, { status: 503 });
          }

          if (isNicknameConflictError(profileError)) {
            await service.auth.admin.deleteUser(userId);
            return NextResponse.json({ error: NICKNAME_TAKEN_MESSAGE }, { status: 409 });
          }

          await service.auth.admin.deleteUser(userId);
          return NextResponse.json(
            { error: "Det gick inte att skapa kontot." },
            { status: 500 }
          );
        }

        profileSaved = true;
        break;
      }

      await new Promise((r) => setTimeout(r, 250));
    }

    if (!profileSaved) {
      const { error: insertError } = await service.from("profiles").insert({
        id: userId,
        ...teslaBetaFields,
      });

      if (insertError) {
        await service.auth.admin.deleteUser(userId);
        if (isTeslaBetaSchemaError(insertError)) {
          return NextResponse.json({ error: TESLA_BETA_SCHEMA_ERROR }, { status: 503 });
        }
        if (insertError.code === "23505") {
          return NextResponse.json({ error: LICENCE_DUPLICATE_MESSAGE }, { status: 409 });
        }
        return NextResponse.json(
          { error: "Det gick inte att skapa kontot." },
          { status: 500 }
        );
      }
    }

    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error("[AUTH] Tesla Beta auto-login failed:", signInError.message);
      return NextResponse.json(
        { error: "Kontot skapades men inloggning misslyckades. Logga in manuellt." },
        { status: 500 }
      );
    }

    console.log("[AUTH] Tesla Beta signup completed:", userId);
    return NextResponse.json({ ok: true, redirect: "/tesla" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[AUTH] Tesla Beta signup failed:", err);
    if (isSupabaseConnectionError(msg)) {
      return NextResponse.json(
        { error: "Det gick inte att ansluta till servern." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Ett oväntat fel uppstod. Försök igen." },
      { status: 500 }
    );
  }
}
