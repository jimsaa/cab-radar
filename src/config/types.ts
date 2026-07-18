/** Country platform types — configuration-driven, no hardcoded country logic. */

export type CountryCode = string; // ISO 3166-1 Alpha-2

export interface FormatRuleConfig {
  pattern: string;
  example: string;
  descriptionKey: string;
}

export interface CountryCityConfig {
  id: string;
  name: string;
  aliases?: string[];
  isOther?: boolean;
}

export interface CountryRegionConfig {
  id: string;
  nameKey: string;
  cities: CountryCityConfig[];
}

export interface ReportMenuCategoryConfig {
  id: string;
  labelKey: string;
  icon: string;
  reportButtons: string[];
  utilities?: string[];
}

export interface CountryConfig {
  id: string;
  code: CountryCode;
  name: string;
  /** When false, country is registered but not selectable in production. */
  enabled: boolean;
  defaultLanguage: string;
  supportedLanguages: string[];
  timezone: string;
  currency: string;
  locale: string;
  emergency: {
    police: string;
    medical: string;
    fire: string;
    nonEmergencyPolice?: string;
  };
  formats: {
    vehicleRegistration: FormatRuleConfig;
    taxiLicense: FormatRuleConfig;
  };
  regions: CountryRegionConfig[];
  defaultCityId: string | null;
  enabledReportTypes: string[];
  enabledReportButtons: string[];
  enabledUtilities: string[];
  reportMenuCategories: ReportMenuCategoryConfig[];
}

export interface ReportTypeCatalogEntry {
  id: string;
  catalogKey: string;
  icon: string;
  labelKey: string;
  descriptionKey: string;
  buttonId: string | null;
  discreet?: boolean;
}

export interface ReportCatalog {
  reportTypes: ReportTypeCatalogEntry[];
}
