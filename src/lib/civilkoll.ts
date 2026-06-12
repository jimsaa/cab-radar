import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingSchemaError } from "./db-errors";

export type CivilSource = "user_submission" | "admin_manual";
export type CivilRegistryStatus = "approved" | "removed";
export type CivilSubmissionStatus = "pending" | "approved" | "rejected";

const REGISTRY_TABLE = "civil_registry";
const SUBMISSIONS_TABLE = "civil_submissions";

export interface CivilRegistryEntry {
  id: string;
  registration_number: string;
  admin_note: string | null;
  observation_count: number;
  last_observed_at: string;
  approved_by: string | null;
  approved_at: string | null;
  source: CivilSource;
  status: CivilRegistryStatus;
  created_at: string;
  updated_at: string;
}

export interface CivilRegistryWithApprover extends CivilRegistryEntry {
  approver_cabradar_user_id: string | null;
  approver_display_name: string | null;
}

export interface CivilSubmission {
  id: string;
  registration_number: string;
  submitted_by: string | null;
  comment: string | null;
  admin_note: string | null;
  status: CivilSubmissionStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  is_test?: boolean;
}

export interface CivilSubmissionWithSubmitter extends CivilSubmission {
  submitter_display_name: string | null;
  submitter_cabradar_user_id: string | null;
  report_count: number;
}

export interface CivilkollLookupResult {
  found: boolean;
}

const REG_PATTERN = /^[A-Z0-9]{2,10}$/;

export function normalizeRegistrationNumber(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

export function isValidRegistrationNumber(normalized: string): boolean {
  return REG_PATTERN.test(normalized);
}

export function civilSourceLabel(source: CivilSource): string {
  return source === "admin_manual" ? "Admin manuellt" : "Föraranmälan";
}

type RawSubmissionRow = Record<string, unknown>;

function normalizeSubmissionRow(row: RawSubmissionRow): CivilSubmission {
  return {
    id: row.id as string,
    registration_number: row.registration_number as string,
    submitted_by: (row.submitted_by as string | null) ?? null,
    comment:
      ((row.comment ?? row.submitter_comment) as string | null) ?? null,
    admin_note:
      ((row.admin_note ?? row.admin_notes) as string | null) ?? null,
    status: row.status as CivilSubmissionStatus,
    reviewed_by: (row.reviewed_by as string | null) ?? null,
    reviewed_at: (row.reviewed_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    is_test: Boolean(row.is_test),
  };
}

async function updateCivilSubmissionStatus(
  supabase: SupabaseClient,
  submissionId: string,
  params: {
    status: CivilSubmissionStatus;
    adminNote: string | null;
    reviewedBy: string;
    reviewedAt: string;
  }
): Promise<void> {
  const base = {
    status: params.status,
    reviewed_by: params.reviewedBy,
    reviewed_at: params.reviewedAt,
    updated_at: params.reviewedAt,
  };

  let { error } = await supabase
    .from(SUBMISSIONS_TABLE)
    .update({ ...base, admin_note: params.adminNote })
    .eq("id", submissionId);

  if (error && isMissingSchemaError(error)) {
    ({ error } = await supabase
      .from(SUBMISSIONS_TABLE)
      .update({ ...base, admin_notes: params.adminNote })
      .eq("id", submissionId));
  }

  if (error) throw error;
}

async function loadProfileMap(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<
  Map<string, { display_name: string | null; cabradar_user_id: string | null }>
> {
  const profileMap = new Map<
    string,
    { display_name: string | null; cabradar_user_id: string | null }
  >();
  if (userIds.length === 0) return profileMap;

  const withCrId = await supabase
    .from("profiles")
    .select("id, display_name, cabradar_user_id")
    .in("id", userIds);

  let profiles: {
    id: string;
    display_name: string | null;
    cabradar_user_id?: string | null;
  }[] = [];

  if (!withCrId.error && withCrId.data) {
    profiles = withCrId.data;
  } else if (withCrId.error && isMissingSchemaError(withCrId.error)) {
    const minimal = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    profiles = minimal.data ?? [];
  } else if (withCrId.error) {
    throw withCrId.error;
  }

  for (const profile of profiles) {
    profileMap.set(profile.id, {
      display_name: profile.display_name ?? null,
      cabradar_user_id: profile.cabradar_user_id ?? null,
    });
  }
  return profileMap;
}

function buildReportCounts(
  submissions: CivilSubmission[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of submissions) {
    counts.set(
      s.registration_number,
      (counts.get(s.registration_number) ?? 0) + 1
    );
  }
  return counts;
}

export async function lookupCivilkollEntry(
  supabase: SupabaseClient,
  registrationNumber: string
): Promise<CivilkollLookupResult> {
  const normalized = normalizeRegistrationNumber(registrationNumber);
  if (!isValidRegistrationNumber(normalized)) {
    return { found: false };
  }

  const { data, error } = await supabase
    .from(REGISTRY_TABLE)
    .select("id")
    .eq("registration_number", normalized)
    .eq("status", "approved")
    .maybeSingle();

  if (error && isMissingSchemaError(error)) {
    const fallback = await supabase
      .from(REGISTRY_TABLE)
      .select("id")
      .eq("registration_number", normalized)
      .maybeSingle();
    if (fallback.error) {
      if (isMissingSchemaError(fallback.error)) return { found: false };
      throw fallback.error;
    }
    return { found: Boolean(fallback.data) };
  }

  if (error) {
    throw error;
  }

  return { found: Boolean(data) };
}

export interface CivilImportLine {
  normalized: string;
  originalLine: string;
}

export interface CivilImportResult {
  imported: number;
  skipped: number;
  invalid: number;
}

/** Parse import text — one registration per line; # comments ignored. */
export function parseCivilImportLines(rawText: string): {
  entries: CivilImportLine[];
  invalid: number;
} {
  let invalid = 0;
  const seen = new Set<string>();
  const entries: CivilImportLine[] = [];

  for (const line of rawText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const normalized = normalizeRegistrationNumber(trimmed);
    if (!isValidRegistrationNumber(normalized)) {
      invalid += 1;
      continue;
    }
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    entries.push({ normalized, originalLine: trimmed });
  }

  return { entries, invalid };
}

const IMPORT_BATCH = 500;

/** Bulk import — skips duplicates already in civil_registry. */
export async function importBulkCivilRegistry(
  supabase: SupabaseClient,
  adminUserId: string,
  rawText: string
): Promise<CivilImportResult> {
  const { entries, invalid } = parseCivilImportLines(rawText);
  if (entries.length === 0) {
    return { imported: 0, skipped: 0, invalid };
  }

  const existing = new Set<string>();
  for (let i = 0; i < entries.length; i += IMPORT_BATCH) {
    const chunk = entries.slice(i, i + IMPORT_BATCH).map((e) => e.normalized);
    const { data, error } = await supabase
      .from(REGISTRY_TABLE)
      .select("registration_number")
      .in("registration_number", chunk);

    if (error) {
      if (isMissingSchemaError(error)) break;
      throw error;
    }

    for (const row of data ?? []) {
      existing.add(row.registration_number as string);
    }
  }

  const now = new Date().toISOString();
  const observedDate = now.slice(0, 10);
  const toInsert = entries.filter((e) => !existing.has(e.normalized));
  const skipped = entries.length - toInsert.length;
  let useFullSchema = true;

  for (let i = 0; i < toInsert.length; i += IMPORT_BATCH) {
    const slice = toInsert.slice(i, i + IMPORT_BATCH);
    const fullBatch = slice.map((entry) => ({
      registration_number: entry.normalized,
      admin_note: entry.originalLine,
      observation_count: 1,
      last_observed_at: observedDate,
      approved_by: adminUserId,
      approved_at: now,
      source: "admin_manual" as const,
      status: "approved" as const,
    }));
    const minimalBatch = slice.map((entry) => ({
      registration_number: entry.normalized,
      last_observed_at: observedDate,
    }));

    let batch = useFullSchema ? fullBatch : minimalBatch;
    let { error } = await supabase.from(REGISTRY_TABLE).insert(batch);

    if (error && useFullSchema && isMissingSchemaError(error)) {
      useFullSchema = false;
      batch = minimalBatch;
      ({ error } = await supabase.from(REGISTRY_TABLE).insert(batch));
    }

    if (error) throw error;
  }

  return { imported: toInsert.length, skipped, invalid };
}

export async function submitCivilkollReport(
  supabase: SupabaseClient,
  userId: string,
  registrationNumber: string,
  comment?: string | null,
  options?: { isTest?: boolean }
): Promise<void> {
  const normalized = normalizeRegistrationNumber(registrationNumber);
  if (!isValidRegistrationNumber(normalized)) {
    throw new Error("Ogiltigt registreringsnummer.");
  }

  const trimmedComment = comment?.trim() || null;
  const isTest = Boolean(options?.isTest);
  const baseRow = {
    registration_number: normalized,
    submitted_by: userId,
    status: "pending" as const,
    is_test: isTest,
  };

  let { error } = await supabase.from(SUBMISSIONS_TABLE).insert({
    ...baseRow,
    comment: trimmedComment,
  });

  if (error && isMissingSchemaError(error)) {
    ({ error } = await supabase.from(SUBMISSIONS_TABLE).insert({
      ...baseRow,
      submitter_comment: trimmedComment,
    }));
  }

  if (error) throw error;
}

export async function fetchCivilSubmissions(
  supabase: SupabaseClient
): Promise<CivilSubmissionWithSubmitter[]> {
  const { data, error } = await supabase
    .from(SUBMISSIONS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }

  const submissions = (data ?? []).map((row) =>
    normalizeSubmissionRow(row as RawSubmissionRow)
  );
  const reportCounts = buildReportCounts(submissions);
  const submitterIds = [
    ...new Set(
      submissions.map((s) => s.submitted_by).filter((id): id is string => !!id)
    ),
  ];
  const profileMap = await loadProfileMap(supabase, submitterIds);

  return submissions.map((submission) => {
    const submitter = submission.submitted_by
      ? profileMap.get(submission.submitted_by)
      : null;
    return {
      ...submission,
      comment: submission.comment ?? null,
      submitter_display_name: submitter?.display_name ?? null,
      submitter_cabradar_user_id: submitter?.cabradar_user_id ?? null,
      report_count: reportCounts.get(submission.registration_number) ?? 1,
    };
  });
}

export async function fetchCivilRegistry(
  supabase: SupabaseClient
): Promise<CivilRegistryWithApprover[]> {
  const full = await supabase
    .from(REGISTRY_TABLE)
    .select("*")
    .eq("status", "approved")
    .order("registration_number", { ascending: true });

  let data = full.data;
  let error = full.error;

  if (error && isMissingSchemaError(error)) {
    const fallback = await supabase
      .from(REGISTRY_TABLE)
      .select("*")
      .order("registration_number", { ascending: true });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }

  const entries = (data ?? []) as CivilRegistryEntry[];
  const approverIds = [
    ...new Set(
      entries.map((e) => e.approved_by).filter((id): id is string => !!id)
    ),
  ];
  const profileMap = await loadProfileMap(supabase, approverIds);

  return entries.map((entry) => {
    const approver = entry.approved_by
      ? profileMap.get(entry.approved_by)
      : null;
    return {
      ...entry,
      observation_count: entry.observation_count ?? 1,
      approver_cabradar_user_id: approver?.cabradar_user_id ?? null,
      approver_display_name: approver?.display_name ?? null,
    };
  });
}

async function upsertApprovedRegistry(
  supabase: SupabaseClient,
  params: {
    registrationNumber: string;
    adminUserId: string;
    adminNote: string | null;
    source: CivilSource;
    submissionId?: string | null;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const observedDate = now.slice(0, 10);

  const { data: existing, error: fetchError } = await supabase
    .from(REGISTRY_TABLE)
    .select("*")
    .eq("registration_number", params.registrationNumber)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    const fullUpdate = {
      admin_note: params.adminNote ?? existing.admin_note,
      observation_count: (existing.observation_count ?? 1) + 1,
      last_observed_at: observedDate,
      approved_by: params.adminUserId,
      approved_at: now,
      status: "approved" as const,
      updated_at: now,
    };
    let { error } = await supabase
      .from(REGISTRY_TABLE)
      .update(fullUpdate)
      .eq("id", existing.id);
    if (error && isMissingSchemaError(error)) {
      ({ error } = await supabase
        .from(REGISTRY_TABLE)
        .update({ last_observed_at: observedDate })
        .eq("id", existing.id));
    }
    if (error) throw error;
    return;
  }

  const fullInsert = {
    registration_number: params.registrationNumber,
    admin_note: params.adminNote,
    observation_count: 1,
    last_observed_at: observedDate,
    approved_by: params.adminUserId,
    approved_at: now,
    source: params.source,
    status: "approved" as const,
    approved_from_submission_id: params.submissionId ?? null,
  };

  let { error: insertError } = await supabase
    .from(REGISTRY_TABLE)
    .insert(fullInsert);

  if (insertError && isMissingSchemaError(insertError)) {
    ({ error: insertError } = await supabase.from(REGISTRY_TABLE).insert({
      registration_number: params.registrationNumber,
      last_observed_at: observedDate,
    }));
  }

  if (insertError) throw insertError;
}

export async function reviewCivilkollSubmission(
  supabase: SupabaseClient,
  adminUserId: string,
  submissionId: string,
  action: "approve" | "reject",
  adminNote?: string | null
): Promise<void> {
  const { data: submission, error: fetchError } = await supabase
    .from(SUBMISSIONS_TABLE)
    .select("*")
    .eq("id", submissionId)
    .single();

  if (fetchError || !submission) {
    throw new Error("Anmälan hittades inte.");
  }

  if (submission.status !== "pending") {
    throw new Error("Anmälan är redan granskad.");
  }

  const now = new Date().toISOString();
  const note = adminNote?.trim() || null;

  if (action === "reject") {
    await updateCivilSubmissionStatus(supabase, submissionId, {
      status: "rejected",
      adminNote: note,
      reviewedBy: adminUserId,
      reviewedAt: now,
    });
    return;
  }

  await upsertApprovedRegistry(supabase, {
    registrationNumber: submission.registration_number,
    adminUserId,
    adminNote: note,
    source: "user_submission",
    submissionId,
  });

  await updateCivilSubmissionStatus(supabase, submissionId, {
    status: "approved",
    adminNote: note,
    reviewedBy: adminUserId,
    reviewedAt: now,
  });
}

export async function createManualRegistryEntry(
  supabase: SupabaseClient,
  adminUserId: string,
  registrationNumber: string,
  adminNote?: string | null
): Promise<void> {
  const normalized = normalizeRegistrationNumber(registrationNumber);
  if (!isValidRegistrationNumber(normalized)) {
    throw new Error("Ogiltigt registreringsnummer.");
  }

  const { data: existing, error: fetchError } = await supabase
    .from(REGISTRY_TABLE)
    .select("id")
    .eq("registration_number", normalized)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) {
    throw new Error("Registreringsnumret finns redan.");
  }

  const now = new Date().toISOString();
  const fullInsert = {
    registration_number: normalized,
    admin_note: adminNote?.trim() || null,
    observation_count: 1,
    last_observed_at: now.slice(0, 10),
    approved_by: adminUserId,
    approved_at: now,
    source: "admin_manual" as const,
    status: "approved" as const,
  };

  let { error } = await supabase.from(REGISTRY_TABLE).insert(fullInsert);

  if (error && isMissingSchemaError(error)) {
    ({ error } = await supabase.from(REGISTRY_TABLE).insert({
      registration_number: normalized,
      last_observed_at: now.slice(0, 10),
    }));
  }

  if (error) throw error;
}

export function formatCivilkollObservedDate(isoDate: string): string {
  return isoDate.slice(0, 10);
}

export function formatCivilDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("sv-SE");
}

/** @deprecated use fetchCivilSubmissions */
export const fetchPendingCivilkollSubmissions = fetchCivilSubmissions;
