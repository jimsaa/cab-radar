"use client";

import { useMemo } from "react";
import type { CountryConfig, CountryCode } from "@/config/types";
import {
  DEFAULT_COUNTRY_CODE,
  getCountryConfig,
} from "@/config/countries";
import {
  COUNTRY_COOKIE,
  resolveCountryCodeFromHost,
} from "@/lib/country-routing/hostname";

function readCountryCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${COUNTRY_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.split("=")[1] ?? "") || null;
}

/**
 * Client-side country resolution: cookie (set by middleware) → hostname → SE.
 */
export function useRequestCountryCode(): CountryCode {
  return useMemo(() => {
    const fromCookie = readCountryCookie();
    if (fromCookie) return fromCookie.toUpperCase();

    if (typeof window !== "undefined") {
      return resolveCountryCodeFromHost(window.location.host);
    }
    return DEFAULT_COUNTRY_CODE;
  }, []);
}

export function useRequestCountry(): CountryConfig {
  const code = useRequestCountryCode();
  return useMemo(() => getCountryConfig(code), [code]);
}
