import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { MembershipType } from "@/lib/types/database";

type MembershipAction = "annual" | "active" | "inactive";

interface ActivateBody {
  driverId?: string;
  action?: MembershipAction;
}

export async function POST(request: Request) {
  console.log("[ADMIN] Membership update started");

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Du saknar behörighet." },
        { status: 401 }
      );
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json(
        { error: "Du saknar behörighet." },
        { status: 403 }
      );
    }

    let body: ActivateBody;
    try {
      body = await request.json();
    } catch (err) {
      console.error("[ADMIN] Unexpected error:", err);
      return NextResponse.json(
        { error: "Det gick inte att uppdatera medlemskapet." },
        { status: 400 }
      );
    }

    const driverId = body.driverId?.trim();
    const action = body.action ?? "annual";

    if (!driverId) {
      return NextResponse.json(
        { error: "Det gick inte att uppdatera medlemskapet." },
        { status: 400 }
      );
    }

    let membershipType: MembershipType;
    let membershipExpiresAt: string | null;

    switch (action) {
      case "annual": {
        membershipType = "annual_member";
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1);
        membershipExpiresAt = expires.toISOString();
        break;
      }
      case "active":
        membershipType = "active_driver";
        membershipExpiresAt = null;
        break;
      case "inactive":
        membershipType = "inactive";
        membershipExpiresAt = null;
        break;
      default:
        return NextResponse.json(
          { error: "Det gick inte att uppdatera medlemskapet." },
          { status: 400 }
        );
    }

    const service = await createServiceClient();
    const { data: updated, error } = await service
      .from("profiles")
      .update({
        membership_type: membershipType,
        membership_expires_at: membershipExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", driverId)
      .select("id, membership_type, membership_expires_at")
      .maybeSingle();

    if (error) {
      console.error("[ADMIN] Membership update failed:", error);
      return NextResponse.json(
        {
          error:
            "Medlemskapskolumner saknas i databasen. Kör migration-membership.sql i Supabase först.",
        },
        { status: 500 }
      );
    }

    if (!updated) {
      return NextResponse.json(
        { error: "Föraren hittades inte." },
        { status: 404 }
      );
    }

    console.log("[ADMIN] Membership update success");

    const message =
      action === "annual"
        ? "✅ Årsmedlemskap aktiverat."
        : action === "active"
          ? "✅ Föraren är aktiv medlem."
          : "✅ Medlemskap inaktiverat.";

    return NextResponse.json({
      ok: true,
      message,
      membershipType,
      membershipExpiresAt,
    });
  } catch (err) {
    console.error("[ADMIN] Unexpected error:", err);
    return NextResponse.json(
      { error: "Det gick inte att uppdatera medlemskapet." },
      { status: 500 }
    );
  }
}
