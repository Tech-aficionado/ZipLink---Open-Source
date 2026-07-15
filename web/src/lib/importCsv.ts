import {
  CampaignValidationError,
  normalizeTags,
  normalizeUtm,
  type UtmValues,
} from "@/lib/campaign";

export const MAX_IMPORT_ROWS = 200;
export const IMPORT_CSV_FIELDS = [
  "originalUrl",
  "customCode",
  "tags",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmTerm",
  "utmContent",
  "enabled",
  "startsAt",
  "expiresAt",
] as const;

export type ImportCsvField = (typeof IMPORT_CSV_FIELDS)[number];
export type ImportRowStatus = "pending" | "error";

export interface ImportRowInput {
  originalUrl: string;
  customCode: string | null;
  tags: string[];
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  enabled: boolean;
  startsAt: string | null;
  expiresAt: string | null;
}

export interface ImportRowPreview {
  rowNumber: number;
  input: ImportRowInput;
  status: ImportRowStatus;
  error: string | null;
}

const FIELD_SET = new Set<string>(IMPORT_CSV_FIELDS);
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const ALIAS_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;
const RESERVED_CODES = new Set([
  "api", "health", "login", "dashboard", "_next", "favicon.ico", "launch",
]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringValue = (record: UnknownRecord, key: ImportCsvField): string => {
  const value = record[key];
  return typeof value === "string" ? value.trim().normalize("NFC") : "";
};

const parseEnabled = (value: unknown): boolean | undefined => {
  if (value === undefined || value === null || value === "") return true;
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return undefined;
};

const parseIso = (value: unknown): string | null | undefined => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!ISO_DATE.test(normalized)) return undefined;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const hasValidRange = (startsAt: string | null, expiresAt: string | null): boolean =>
  !startsAt || !expiresAt || Date.parse(startsAt) < Date.parse(expiresAt);

const validDestination = (value: string): boolean => {
  if (!value || value.length > 2048 || CONTROL_CHARS.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  } catch {
    return false;
  }
};

const tagsFrom = (value: unknown): string[] => {
  if (Array.isArray(value)) return normalizeTags(value);
  if (value === undefined || value === null || value === "") return [];
  if (typeof value !== "string") {
    throw new CampaignValidationError("tags must be pipe-separated text");
  }
  return normalizeTags(value.split("|"));
};

export const importInputUtm = (input: ImportRowInput): UtmValues | null =>
  normalizeUtm({
    source: input.utmSource,
    medium: input.utmMedium,
    campaign: input.utmCampaign,
    term: input.utmTerm,
    content: input.utmContent,
  });

const normalizeRecord = (record: UnknownRecord): ImportRowPreview["input"] => {
  const enabled = parseEnabled(record.enabled);
  const startsAt = parseIso(record.startsAt);
  const expiresAt = parseIso(record.expiresAt);
  return {
    originalUrl: stringValue(record, "originalUrl"),
    customCode: stringValue(record, "customCode") || null,
    tags: tagsFrom(record.tags),
    utmSource: stringValue(record, "utmSource"),
    utmMedium: stringValue(record, "utmMedium"),
    utmCampaign: stringValue(record, "utmCampaign"),
    utmTerm: stringValue(record, "utmTerm"),
    utmContent: stringValue(record, "utmContent"),
    enabled: enabled ?? true,
    startsAt: startsAt ?? null,
    expiresAt: expiresAt ?? null,
  };
};

const validateRecord = (record: UnknownRecord, input: ImportRowInput): string[] => {
  const errors: string[] = [];
  const unsupported = Object.keys(record).filter((key) => !FIELD_SET.has(key));
  if (unsupported.length > 0) errors.push(`Unsupported field: ${unsupported[0]}`);
  if (!validDestination(input.originalUrl)) {
    errors.push("A valid http(s) originalUrl without credentials is required");
  }
  if (input.customCode) {
    if (!ALIAS_PATTERN.test(input.customCode)) {
      errors.push("Alias must be 3-32 chars: letters, numbers, - or _");
    } else if (RESERVED_CODES.has(input.customCode.toLowerCase())) {
      errors.push("That alias is reserved");
    }
  }
  if (parseEnabled(record.enabled) === undefined) errors.push("enabled must be true or false");
  const startsAt = parseIso(record.startsAt);
  const expiresAt = parseIso(record.expiresAt);
  if (startsAt === undefined) errors.push("startsAt must be a valid ISO date string");
  if (expiresAt === undefined) errors.push("expiresAt must be a valid ISO date string");
  if (startsAt !== undefined && expiresAt !== undefined && !hasValidRange(startsAt, expiresAt)) {
    errors.push("startsAt must be earlier than expiresAt");
  }
  return errors;
};

export const validateImportRecords = (records: unknown): ImportRowPreview[] => {
  if (!Array.isArray(records)) throw new TypeError("records must be an array");
  if (records.length > MAX_IMPORT_ROWS) {
    throw new RangeError(`An import can contain at most ${MAX_IMPORT_ROWS} rows`);
  }

  return records.map((value, index) => {
    const rowNumber = index + 1;
    if (!isRecord(value)) {
      return {
        rowNumber,
        input: normalizeRecord({}),
        status: "error",
        error: "Each import row must be an object",
      };
    }

    const errors: string[] = [];
    let tags: string[] = [];
    try {
      tags = tagsFrom(value.tags);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Invalid tags");
    }
    const input = normalizeRecord({ ...value, tags });

    errors.push(...validateRecord(value, input));
    try {
      importInputUtm(input);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Invalid UTM fields");
    }

    return {
      rowNumber,
      input,
      status: errors.length === 0 ? "pending" : "error",
      error: errors.length === 0 ? null : Array.from(new Set(errors)).join("; "),
    };
  });
};
