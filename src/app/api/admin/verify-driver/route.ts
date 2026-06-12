import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { DriverVerificationStatus } from "@/lib/verification";

type VerifyAction = "approve" | "reject" | "reset";

interface VerifyBody {
  driverId?: string;
  action?: VerifyAction;
}

export async function POST(request: Request) {
  console.log("[ADMIN] Verification started");

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Du saknar behörighet att verifiera förare." },
        { status: 401 }
      );
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    const isAdmin = Boolean(adminProfile?.is_admin);
    console.log("[ADMIN] Is admin:", isAdmin);

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Du saknar behörighet att verifiera förare." },
        { status: 403 }
      );
    }

    let body: VerifyBody;
    try {
      body = await request.json();
    } catch (err) {
      console.error("[ADMIN] Unexpected error:", err);
      return NextResponse.json(
        { error: "Det gick inte att uppdatera föraren. Försök igen." },
        { status: 400 }
      );
    }

    const driverId = body.driverId?.trim();
    const action = body.action;

    console.log("[ADMIN] Driver ID:", driverId ?? "(missing)");

    if (!driverId || !action) {
      return NextResponse.json(
        { error: "Det gick inte att uppdatera föraren. Försök igen." },
        { status: 400 }
      );
    }

    if (action === "approve") {
      console.log("[ADMIN] Approve clicked");
    } else if (action === "reject") {
      console.log("[ADMIN] Reject clicked");
    }

    let verificationStatus: DriverVerificationStatus;
    let verifiedAt: string | null;

    switch (action) {
      case "approve":
        verificationStatus = "verified";
        verifiedAt = new Date().toISOString();
        break;
      case "reject":
        verificationStatus = "rejected";
        verifiedAt = null;
        break;
      case "reset":
        verificationStatus = "pending_verification";
        verifiedAt = null;
        break;
      default:
        return NextResponse.json(
          { error: "Det gick inte att uppdatera föraren. Försök igen." },
          { status: 400 }
        );
    }

    const service = await createServiceClient();

    const updatePayload: Record<string, unknown> = {
      verification_status: verificationStatus,
      updated_at: new Date().toISOString(),
    };

    if (verifiedAt !== undefined) {
      updatePayload.verified_at = verifiedAt;
    }

    if (action === "approve") {
      updatePayload.welcome_pending = true;
      updatePayload.test_mode_enabled = true;
    } else if (action === "reset") {
      updatePayload.welcome_pending = false;
    }

    const { data: updated, error: updateError } = await service
      .from("profiles")
      .update(updatePayload)
      .eq("id", driverId)
      .select("id, verification_status, verified_at")
      .maybeSingle();

    if (updateError) {
      console.error("[ADMIN] Database update failed:", updateError);

      const { data: fallbackData, error: fallbackError } = await service
        .from("profiles")
        .update({
          verification_status: verificationStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", driverId)
        .select("id, verification_status")
        .maybeSingle();

      if (fallbackError || !fallbackData) {
        console.error("[ADMIN] Database update failed:", fallbackError ?? "no row");
        return NextResponse.json(
          { error: "Det gick inte att uppdatera föraren. Försök igen." },
          { status: 500 }
        );
      }
    } else if (!updated) {
      console.error("[ADMIN] Database update failed: profile not found");
      return NextResponse.json(
        { error: "Det gick inte att uppdatera föraren. Försök igen." },
        { status: 404 }
      );
    }

    console.log("[ADMIN] Database update success");

    const message =
      action === "approve"
        ? "✅ Föraren har aktiverats."
        : action === "reject"
          ? "✅ Föraren har avvisats."
          : "✅ Föraren har återställts.";

    return NextResponse.json({
      ok: true,
      message,
      verificationStatus,
    });
  } catch (err) {
    console.error("[ADMIN] Unexpected error:", err);
    return NextResponse.json(
      { error: "Det gick inte att uppdatera föraren. Försök igen." },
      { status: 500 }
    );
  }
}
