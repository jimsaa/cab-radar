import { createHmac } from "crypto";

export function hashLicence(licence: string): string {
  const secret = process.env.LICENCE_HASH_SECRET;
  if (!secret) {
    throw new Error("LICENCE_HASH_SECRET is not configured");
  }
  return createHmac("sha256", secret).update(licence).digest("hex");
}
