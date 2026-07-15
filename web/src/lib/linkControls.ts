import { Timestamp } from "firebase-admin/firestore";

export const LINK_SCHEMA_VERSION = 3;
export const MAX_URL_LENGTH = 2048;
export type LinkStatus = "active" | "scheduled" | "paused" | "expired" | "error";

export interface LinkControlsView {
  enabled: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  status: LinkStatus;
}

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

export function isValidDestination(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.length > MAX_URL_LENGTH || CONTROL_CHARS.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function parseOptionalIso(value: unknown): Date | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || !ISO_DATE.test(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function readTimestamp(value: unknown): Date | null | undefined {
  if (value === undefined) return null;
  if (!(value instanceof Timestamp)) return undefined;
  const date = value.toDate();
  return Number.isNaN(date.getTime()) ? undefined : date;
}
export function readLinkControls(data: Record<string, unknown>, now = Date.now()): LinkControlsView {
  const starts = readTimestamp(data.startsAt);
  const expires = readTimestamp(data.expiresAt);
  const schemaValid = data.schemaVersion === undefined ||
    (Number.isInteger(data.schemaVersion) && Number(data.schemaVersion) >= 1 && Number(data.schemaVersion) <= LINK_SCHEMA_VERSION);
  const enabledValid = data.enabled === undefined || typeof data.enabled === "boolean";
  const enabled = enabledValid ? data.enabled !== false : false;
  const invalid = !schemaValid || !enabledValid || starts === undefined || expires === undefined ||
    (starts instanceof Date && expires instanceof Date && starts.getTime() >= expires.getTime()) ||
    !isValidDestination(data.originalUrl);

  let status: LinkStatus = "active";
  if (invalid) status = "error";
  else if (!enabled) status = "paused";
  else if (starts && now < starts.getTime()) status = "scheduled";
  else if (expires && now >= expires.getTime()) status = "expired";

  return {
    enabled,
    startsAt: starts instanceof Date ? starts.toISOString() : null,
    expiresAt: expires instanceof Date ? expires.toISOString() : null,
    status,
  };
}

export function hasValidRange(startsAt: Date | null, expiresAt: Date | null): boolean {
  return !startsAt || !expiresAt || startsAt.getTime() < expiresAt.getTime();
}