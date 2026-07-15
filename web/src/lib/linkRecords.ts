import { FieldValue, Timestamp, type DocumentReference } from "firebase-admin/firestore";
import { sanitizeStoredTags, sanitizeStoredUtm, type UtmValues } from "@/lib/campaign";
import { LINK_SCHEMA_VERSION, readLinkControls } from "@/lib/linkControls";

export const CUSTOM_CODE_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;
export const RESERVED_CODES = new Set([
  "api", "health", "login", "dashboard", "_next", "favicon.ico", "launch",
]);

export type LinkDocument = Record<string, unknown>;

export interface NewLinkRecord {
  shortCode: string;
  originalUrl: string;
  ownerUid: string;
  ownerEmail: string;
  tags: string[];
  utm: UtmValues | null;
  enabled: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  importId?: string;
  importRowId?: string;
}

export const isAlreadyExistsError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  if (code === 6 || code === "already-exists") return true;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.toLowerCase().includes("already exists");
};

export const buildShortUrl = (shortCode: string): string => {
  const base = process.env.NEXT_PUBLIC_SHORT_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "";
  return `${base.replace(/\/+$/, "")}/${shortCode}`;
};

export const timestampToIso = (value: unknown): string | null =>
  value instanceof Timestamp ? value.toDate().toISOString() : null;

export const buildLinkDocument = (input: NewLinkRecord): LinkDocument => {
  const data: LinkDocument = {
    schemaVersion: LINK_SCHEMA_VERSION,
    shortCode: input.shortCode,
    originalUrl: input.originalUrl,
    ownerUid: input.ownerUid,
    ownerEmail: input.ownerEmail,
    tags: input.tags,
    enabled: input.enabled,
    createdAt: FieldValue.serverTimestamp(),
    clicks: 0,
    lastAccessedAt: null,
  };
  if (input.utm) data.utm = input.utm;
  if (input.startsAt) data.startsAt = Timestamp.fromDate(input.startsAt);
  if (input.expiresAt) data.expiresAt = Timestamp.fromDate(input.expiresAt);
  if (input.importId) data.importId = input.importId;
  if (input.importRowId) data.importRowId = input.importRowId;
  return data;
};

export const createLinkRecord = async (
  reference: DocumentReference,
  input: NewLinkRecord,
): Promise<void> => {
  await reference.create(buildLinkDocument(input));
};

export const serializeLink = (
  shortCode: string,
  data: LinkDocument,
  now = Date.now(),
) => ({
  shortCode,
  originalUrl: typeof data.originalUrl === "string" ? data.originalUrl : "",
  shortUrl: buildShortUrl(shortCode),
  clicks: typeof data.clicks === "number" ? data.clicks : 0,
  createdAt: timestampToIso(data.createdAt),
  lastAccessedAt: timestampToIso(data.lastAccessedAt),
  tags: sanitizeStoredTags(data.tags),
  utm: sanitizeStoredUtm(data.utm),
  ...readLinkControls(data, now),
});

export const validateCustomCode = (value: string): string | null => {
  if (!CUSTOM_CODE_PATTERN.test(value)) return "Alias must be 3-32 chars: letters, numbers, - or _";
  if (RESERVED_CODES.has(value.toLowerCase())) return "That alias is reserved";
  return null;
};
