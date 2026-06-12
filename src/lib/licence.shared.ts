export const LICENCE_INVALID_MESSAGE =
  "Detta taxiförarleg. är inte giltigt.";
export const LICENCE_DUPLICATE_MESSAGE =
  "Detta taxiförarleg. finns redan registrerat.";

const LICENCE_PATTERN = /^\d{6}$/;

export function normalizeLicenceInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

export function isValidLicence(licence: string): boolean {
  return LICENCE_PATTERN.test(licence);
}

export function maskLicenceLast4(last4: string | null | undefined): string {
  if (!last4 || last4.length !== 4) return "—";
  return `XX${last4}`;
}

export function licenceLast4(licence: string): string {
  return licence.slice(-4);
}

export class LicenceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LicenceValidationError";
  }
}

export class LicenceDuplicateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LicenceDuplicateError";
  }
}

export function validateLicenceOrThrow(licence: string): void {
  if (!isValidLicence(licence)) {
    throw new LicenceValidationError(LICENCE_INVALID_MESSAGE);
  }
}
