import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getSupabaseConfigError,
  isSupabaseConnectionError,
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
  isMissingColumnError,
  licenceProfileFields,
  profileHasLicenceHashColumn,
  saveSignupProfile,
} from "@/lib/signup-profile";
import {
  isNicknameConflictError,
  NICKNAME_TAKEN_MESSAGE,
  normalizeNickname,
  validateNickname,
} from "@/lib/driver-nickname";
import {
  formatSignupAuthError,
  logSignupFailure,
  mapSignupProfileError,
} from "@/lib/signup-route-errors";

interface SignupBody {
  email?: string;
  password?: string;
  displayName?: string;
  nickname?: string;
  phoneNumber?: string;
  driverCity?: string;
  taxiCompanyName?: string;
  taxiNumber?: string;
  driverLicenseNumber?: string;
}

function normalizePhone(raw: string): string {
  return raw.replace(/\s/g, "");
}

export async function POST(request: Request) {
  console.log("[AUTH] Signup started");

  const configError = getSupabaseConfigError();
  if (configError) {
    console.error("[AUTH] Signup failed: config", configError);
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  let body: SignupBody;
  try {
    body = await request.json();
  } catch (err) {
    logSignupFailure("validation", err);
    return NextResponse.json(
      { error: "Ett oväntat fel uppstod. Försök igen." },
      { status: 400 }
    );
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const displayName = body.displayName?.trim();
  const nicknameRaw = body.nickname?.trim();
  const phoneNumber = body.phoneNumber?.trim();
  const driverCity = body.driverCity?.trim();
  const taxiCompanyName = body.taxiCompanyName?.trim();
  const taxiNumber = body.taxiNumber?.trim() || null;
  const licence = normalizeLicenceInput(body.driverLicenseNumber ?? "");

  if (!email || !password) {
    logSignupFailure("validation", "missing email or password");
    return NextResponse.json(
      { error: "E-post och lösenord krävs." },
      { status: 400 }
    );
  }

  const userEmail = email;
  const resolvedDisplayName = displayName || userEmail.split("@")[0];

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Lösenordet måste vara minst 6 tecken." },
      { status: 400 }
    );
  }

  if (!phoneNumber || normalizePhone(phoneNumber).length < 8) {
    return NextResponse.json(
      { error: "Mobilnummer krävs." },
      { status: 400 }
    );
  }

  if (!driverCity || driverCity.length < 2) {
    return NextResponse.json({ error: "Stad krävs." }, { status: 400 });
  }

  if (!taxiCompanyName || taxiCompanyName.length < 2) {
    return NextResponse.json({ error: "Taxibolag krävs." }, { status: 400 });
  }

  if (!isValidLicence(licence)) {
    logSignupFailure("validation", "invalid licence");
    return NextResponse.json({ error: LICENCE_INVALID_MESSAGE }, { status: 400 });
  }

  const nicknameError = validateNickname(nicknameRaw ?? "");
  if (nicknameError) {
    return NextResponse.json({ error: nicknameError }, { status: 400 });
  }
  const nickname = normalizeNickname(nicknameRaw ?? "");

  if (!process.env.LICENCE_HASH_SECRET) {
    logSignupFailure("validation", "LICENCE_HASH_SECRET missing");
    return NextResponse.json(
      { error: "Ett oväntat fel uppstod. Försök igen." },
      { status: 503 }
    );
  }

  let licenceHash: string;
  try {
    licenceHash = hashLicence(licence);
  } catch (err) {
    logSignupFailure("validation", err);
    return NextResponse.json(
      { error: "Ett oväntat fel uppstod. Försök igen." },
      { status: 503 }
    );
  }

  try {
    const supabase = await createServiceClient();
    const useHashColumn = await profileHasLicenceHashColumn(supabase);
    const licenceFields = licenceProfileFields(licence, licenceHash, useHashColumn);

    console.log("[AUTH] Signup profile schema:", {
      useHashColumn,
      licenceFieldKeys: Object.keys(licenceFields),
    });

    if (await findDuplicateLicence(supabase, licence, licenceHash, useHashColumn)) {
      logSignupFailure("validation", "duplicate licence");
      return NextResponse.json({ error: LICENCE_DUPLICATE_MESSAGE }, { status: 409 });
    }

    const { data: nicknameTaken, error: nicknameLookupError } = await supabase
      .from("profiles")
      .select("id")
      .ilike("nickname", nickname)
      .maybeSingle();

    if (nicknameLookupError && !isMissingColumnError(nicknameLookupError)) {
      logSignupFailure("nickname_check", nicknameLookupError);
      const mapped = mapSignupProfileError(nicknameLookupError, "nickname_check");
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }

    if (nicknameTaken) {
      return NextResponse.json({ error: NICKNAME_TAKEN_MESSAGE }, { status: 409 });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userEmail,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: resolvedDisplayName,
        nickname,
        phone_number: phoneNumber,
      },
    });

    console.log("[AUTH] Supabase signup response:", {
      userId: authData?.user?.id ?? null,
      error: authError?.message ?? null,
      code: authError?.code ?? null,
    });

    if (authError || !authData.user) {
      const msg = authError?.message ?? "unknown auth error";
      logSignupFailure("auth_create", authError ?? msg, { email: userEmail });
      if (isSupabaseConnectionError(msg)) {
        return NextResponse.json(
          { error: "Det gick inte att ansluta till servern." },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: formatSignupAuthError(msg) },
        { status: 400 }
      );
    }

    const userId = authData.user.id;
    console.log("[AUTH] Profile creation started", { userId });

    const profileResult = await saveSignupProfile(
      supabase,
      userId,
      resolvedDisplayName,
      licenceFields,
      {
        phone_number: phoneNumber,
        driver_city: driverCity,
        taxi_company_name: taxiCompanyName,
        nickname,
        taxi_number: taxiNumber,
      }
    );

    if (!profileResult.ok) {
      logSignupFailure("profile_update", profileResult.message, { userId });
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: profileResult.message },
        { status: profileResult.status }
      );
    }

    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        display_name: resolvedDisplayName,
        nickname,
        phone_number: phoneNumber,
        ...(useHashColumn ? {} : { driver_license_number: licence }),
      },
    });

    console.log("[AUTH] Profile creation success", { userId });
    console.log("[AUTH] Signup completed", { userId });
    return NextResponse.json({
      ok: true,
      message:
        "Kontot är aktiverat. Logga in och börja använda CabRadar — TEST-läge är på tills du stänger av det.",
      cabradarUserId: null,
      needsEmailConfirm: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logSignupFailure("unexpected", err);
    if (isSupabaseConnectionError(msg)) {
      return NextResponse.json(
        { error: "Det gick inte att ansluta till servern." },
        { status: 503 }
      );
    }
    if (isNicknameConflictError(err as { code?: string })) {
      return NextResponse.json({ error: NICKNAME_TAKEN_MESSAGE }, { status: 409 });
    }
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? `Ett oväntat fel uppstod: ${msg}`
            : "Ett oväntat fel uppstod. Försök igen.",
      },
      { status: 500 }
    );
  }
}
