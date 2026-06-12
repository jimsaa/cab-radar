export const TAXI_OPERATOR_OPTIONS = [
  "Taxi Göteborg",
  "Sverigetaxi",
  "Uber",
  "Bolt",
  "Minitaxi",
  "Annat",
] as const;

export const TAXIMETER_TYPE_OPTIONS = [
  "M2",
  "Halda",
  "Frogne",
  "Megtax",
  "Annan",
  "Ingen taxameter",
] as const;

export type TaxiOperatorOption = (typeof TAXI_OPERATOR_OPTIONS)[number];
export type TaximeterTypeOption = (typeof TAXIMETER_TYPE_OPTIONS)[number];

export interface ProfileTaxiInfo {
  taxi_company_name: string | null;
  taxi_operator: string | null;
  taxi_number: string | null;
  taximeter_type: string | null;
}

export function resolveTaxiOperator(
  preset: string,
  custom: string
): string | null {
  const trimmedCustom = custom.trim();
  if (preset === "Annat") {
    return trimmedCustom || null;
  }
  return preset.trim() || null;
}

export function splitTaxiOperator(value: string | null): {
  preset: string;
  custom: string;
} {
  if (!value) return { preset: "", custom: "" };
  const known = TAXI_OPERATOR_OPTIONS.filter((o) => o !== "Annat");
  if (known.includes(value as (typeof known)[number])) {
    return { preset: value, custom: "" };
  }
  return { preset: "Annat", custom: value };
}
