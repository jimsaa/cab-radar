import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
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
  isMissingColumnError,
  licenceProfileFields,
  PROFILE_SCHEMA_ERROR,
  profileHasLicenceHashColumn,
} from "@/lib/signup-profile";
import {
  isNicknameConflictError,
  NICKNAME_TAKEN_MESSAGE,
  normalizeNickname,
  validateNickname,
} from "@/lib/driver-nickname";

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
    console.error("[AUTH] Signup failed:", configError);
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  let body: SignupBody;
  try {
    body = await request.json();
  } catch (err) {
    console.error("[AUTH] Signup failed:", err);
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
    console.error("[AUTH] Signup failed: missing email or password");
    return NextResponse.json(
      { error: "Det gick inte att skapa kontot." },
      { status: 400 }
    );
  }

  const userEmail = email;

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
    console.error("[AUTH] Signup failed: invalid licence");
    return NextResponse.json({ error: LICENCE_INVALID_MESSAGE }, { status: 400 });
  }

  const nicknameError = validateNickname(nicknameRaw ?? "");
  if (nicknameError) {
    return NextResponse.json({ error: nicknameError }, { status: 400 });
  }
  const nickname = normalizeNickname(nicknameRaw ?? "");

  if (!process.env.LICENCE_HASH_SECRET) {
    console.error("[AUTH] Signup failed: LICENCE_HASH_SECRET not configured");
    return NextResponse.json(
      { error: "Ett oväntat fel uppstod. Försök igen." },
      { status: 503 }
    );
  }

  let licenceHash: string;
  try {
    licenceHash = hashLicence(licence);
  } catch (err) {
    console.error("[AUTH] Signup failed: licence hash", err);
    return NextResponse.json(
      { error: "Ett oväntat fel uppstod. Försök igen." },
      { status: 503 }
    );
  }

  try {
    const supabase = await createServiceClient();
    const useHashColumn = await profileHasLicenceHashColumn(supabase);
    const licenceFields = licenceProfileFields(licence, licenceHash, useHashColumn);

    if (await findDuplicateLicence(supabase, licence, licenceHash, useHashColumn)) {
      console.error("[AUTH] Signup failed: duplicate licence");
      return NextResponse.json({ error: LICENCE_DUPLICATE_MESSAGE }, { status: 409 });
    }

    const { data: nicknameTaken } = await supabase
      .from("profiles")
      .select("id")
      .ilike("nickname", nickname)
      .maybeSingle();

    if (nicknameTaken) {
      return NextResponse.json({ error: NICKNAME_TAKEN_MESSAGE }, { status: 409 });
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userEmail,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName || userEmail.split("@")[0],
        phone_number: phoneNumber || "",
      },
    });

    console.log("[AUTH] Supabase signup response:", {
      userId: authData?.user?.id ?? null,
      error: authError?.message ?? null,
    });

    if (authError || !authData.user) {
      const msg = authError?.message ?? "unknown auth error";
      console.error("[AUTH] Signup failed:", msg);
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

    console.log("[AUTH] Profile creation started");

    const userId = authData.user.id;

    async function saveLicenceOnProfile(): Promise<
      { ok: true; cabradarUserId: string | null } | { ok: false; error: string; status: number }
    > {
      const onboardingFields = {
        phone_number: phoneNumber,
        driver_city: driverCity,
        taxi_company_name: taxiCompanyName,
        nickname,
        ...(taxiNumber ? { taxi_number: taxiNumber } : {}),
      };

      for (let attempt = 0; attempt < 8; attempt++) {
        const { data: profile, error: profileSelectError } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();

        if (profileSelectError && !isMissingColumnError(profileSelectError)) {
          console.error("[AUTH] profile lookup failed", profileSelectError);
        }

        if (profile) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              ...licenceFields,
              ...onboardingFields,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);

          if (profileError) {
            console.error("[AUTH] Signup failed: profile licence update", profileError);

            if (isMissingColumnError(profileError)) {
              await supabase.auth.admin.updateUserById(userId, {
                user_metadata: {
                  display_name: displayName || userEmail.split("@")[0],
                  nickname,
                  phone_number: phoneNumber || "",
                  driver_license_number: licence,
                },
              });
              console.warn(
                "[AUTH] Licence stored in user metadata — run migration-signup-profile-fix.sql"
              );
              return { ok: true, cabradarUserId: null };
            }

            await supabase.auth.admin.deleteUser(userId);
            if (profileError.code === "23505") {
              return {
                ok: false,
                error:
                  profileError.message?.includes("nickname") ||
                  profileError.details?.includes("nickname")
                    ? NICKNAME_TAKEN_MESSAGE
                    : LICENCE_DUPLICATE_MESSAGE,
                status: 409,
              };
            }
            return { ok: false, error: "Det gick inte att skapa kontot.", status: 500 };
          }

          return { ok: true, cabradarUserId: null };
        }

        await new Promise((r) => setTimeout(r, 250));
      }

      // Profile may already exist from auth trigger — final lookup
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

      if (existingProfile) {
        const { error: retryError } = await supabase
          .from("profiles")
          .update({
            ...licenceFields,
            ...onboardingFields,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (retryError && !isMissingColumnError(retryError)) {
          console.error("[AUTH] Signup profile retry failed", retryError);
          await supabase.auth.admin.deleteUser(userId);
          return { ok: false, error: "Det gick inte att skapa kontot.", status: 500 };
        }

        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: {
            display_name: displayName || userEmail.split("@")[0],
            nickname,
            phone_number: phoneNumber || "",
            driver_license_number: licence,
          },
        });
        return { ok: true, cabradarUserId: null };
      }

      const { error: insertError } = await supabase.from("profiles").insert({
        id: userId,
        display_name: displayName || userEmail.split("@")[0],
        nickname,
        ...licenceFields,
        phone_number: phoneNumber,
        driver_city: driverCity,
        taxi_company_name: taxiCompanyName,
        taxi_number: taxiNumber,
      });

      if (insertError) {
        console.error("[AUTH] Signup failed: profile insert", insertError);

        if (isMissingColumnError(insertError)) {
          const { error: minimalInsertError } = await supabase.from("profiles").insert({
            id: userId,
            display_name: displayName || userEmail.split("@")[0],
          });

          if (minimalInsertError) {
            if (minimalInsertError.code === "23505") {
              await supabase.auth.admin.updateUserById(userId, {
                user_metadata: {
                  display_name: displayName || userEmail.split("@")[0],
                  phone_number: phoneNumber || "",
                  driver_license_number: licence,
                },
              });
              return { ok: true, cabradarUserId: null };
            }
            console.error("[AUTH] Signup failed: minimal profile insert", minimalInsertError);
            await supabase.auth.admin.deleteUser(userId);
            return { ok: false, error: PROFILE_SCHEMA_ERROR, status: 503 };
          }

          await supabase.auth.admin.updateUserById(userId, {
            user_metadata: {
              display_name: displayName || userEmail.split("@")[0],
              phone_number: phoneNumber || "",
              driver_license_number: licence,
            },
          });

          console.warn(
            "[AUTH] Profile created without licence columns — run migration-signup-profile-fix.sql"
          );
          return { ok: true, cabradarUserId: null };
        }

        await supabase.auth.admin.deleteUser(userId);
        if (insertError.code === "23505") {
          return { ok: false, error: LICENCE_DUPLICATE_MESSAGE, status: 409 };
        }
        return { ok: false, error: "Det gick inte att skapa kontot.", status: 500 };
      }

      return { ok: true, cabradarUserId: null };
    }

    const profileResult = await saveLicenceOnProfile();
    if (!profileResult.ok) {
      return NextResponse.json(
        { error: profileResult.error },
        { status: profileResult.status }
      );
    }

    console.log("[AUTH] Profile creation success");
    console.log("[AUTH] Signup completed");
    return NextResponse.json({
      ok: true,
      message: "Kontot har skapats och väntar på godkännande.",
      cabradarUserId: profileResult.cabradarUserId,
      needsEmailConfirm: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[AUTH] Signup failed:", err);
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
