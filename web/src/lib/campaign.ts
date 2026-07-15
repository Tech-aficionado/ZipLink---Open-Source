export const MAX_TAGS = 5;
export const MAX_TAG_CODE_POINTS = 24;
export const MAX_TAG_BYTES = 64;
export const MAX_UTM_CODE_POINTS = 100;
export const MAX_UTM_BYTES = 256;

export const UTM_KEYS = ["source", "medium", "campaign", "term", "content"] as const;
export type UtmKey = (typeof UTM_KEYS)[number];
export type UtmValues = Record<UtmKey, string>;

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const UTM_KEY_SET = new Set<string>(UTM_KEYS);
const UTM_QUERY_KEYS = new Set(UTM_KEYS.map((key) => `utm_${key}`));
const EMPTY_UTM: UtmValues = { source: "", medium: "", campaign: "", term: "", content: "" };

export class CampaignValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CampaignValidationError";
  }
}

const utf8Length = (value: string): number => new TextEncoder().encode(value).length;
const codePointLength = (value: string): number => Array.from(value).length;

const normalizeText = (value: string): string => value.trim().normalize("NFC");

const normalizeTag = (value: string): string => normalizeText(value).toLowerCase();

const validTag = (value: string): boolean =>
  Boolean(value) &&
  !CONTROL_CHARS.test(value) &&
  codePointLength(value) <= MAX_TAG_CODE_POINTS &&
  utf8Length(value) <= MAX_TAG_BYTES;

export const normalizeTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) throw new CampaignValidationError("tags must be an array of strings");
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item !== "string") throw new CampaignValidationError("tags must contain only strings");
    const tag = normalizeTag(item);
    if (!validTag(tag)) {
      throw new CampaignValidationError("Each tag must be 1-24 characters, at most 64 UTF-8 bytes, with no control characters");
    }
    if (!seen.has(tag)) {
      seen.add(tag);
      normalized.push(tag);
    }
  }
  if (normalized.length > MAX_TAGS) throw new CampaignValidationError(`A link can have at most ${MAX_TAGS} tags`);
  return normalized;
};

export const sanitizeStoredTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const tag = normalizeTag(item);
    if (!validTag(tag) || seen.has(tag)) continue;
    seen.add(tag);
    normalized.push(tag);
    if (normalized.length === MAX_TAGS) break;
  }
  return normalized;
};

export const parseTagsText = (value: string): string[] => {
  if (!value.trim()) return [];
  return normalizeTags(value.split(","));
};

const normalizeUtmField = (key: UtmKey, value: unknown): string => {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") throw new CampaignValidationError(`utm.${key} must be a string`);
  const normalized = normalizeText(value);
  if (CONTROL_CHARS.test(normalized)) {
    throw new CampaignValidationError(`utm.${key} must not contain control characters`);
  }
  if (codePointLength(normalized) > MAX_UTM_CODE_POINTS || utf8Length(normalized) > MAX_UTM_BYTES) {
    throw new CampaignValidationError(`utm.${key} must be at most 100 characters and 256 UTF-8 bytes`);
  }
  return normalized;
};

export const normalizeUtm = (value: unknown): UtmValues | null => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new CampaignValidationError("utm must be an object or null");
  }
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !UTM_KEY_SET.has(key))) {
    throw new CampaignValidationError("utm contains unsupported fields");
  }
  const result = { ...EMPTY_UTM };
  for (const key of UTM_KEYS) result[key] = normalizeUtmField(key, input[key]);
  const used = UTM_KEYS.some((key) => Boolean(result[key]));
  if (!used) return null;
  if (!result.source || !result.medium || !result.campaign) {
    throw new CampaignValidationError("UTM source, medium, and campaign are required when the builder is used");
  }
  return result;
};

export const sanitizeStoredUtm = (value: unknown): UtmValues | null => {
  try {
    return normalizeUtm(value);
  } catch {
    return null;
  }
};

const assertDestination = (value: string): URL => {
  if (!value || value.length > 2048 || CONTROL_CHARS.test(value)) {
    throw new CampaignValidationError("Enter a valid URL up to 2048 characters with no control characters");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CampaignValidationError("Enter a valid URL, including http:// or https://");
  }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
    throw new CampaignValidationError("Only http and https URLs without credentials are supported");
  }
  return url;
};

/**
 * Applies or clears builder-managed UTM values without changing unrelated query
 * parameters or the fragment. Call this only when the builder was explicitly
 * applied or cleared; an omitted `utm` field should leave the URL untouched.
 */
export const mergeUtmIntoUrl = (originalUrl: string, utm: UtmValues | null): string => {
  const url = assertDestination(originalUrl);
  const keysToDelete = new Set<string>();
  url.searchParams.forEach((_value, key) => {
    if (UTM_QUERY_KEYS.has(key.toLocaleLowerCase())) keysToDelete.add(key);
  });
  keysToDelete.forEach((key) => url.searchParams.delete(key));
  if (utm) {
    for (const key of UTM_KEYS) {
      if (utm[key]) url.searchParams.set(`utm_${key}`, utm[key]);
    }
  }
  const serialized = url.toString();
  assertDestination(serialized);
  return serialized;
};

export const previewCampaignUrl = (originalUrl: string, utm: unknown): string => {
  const normalized = normalizeUtm(utm);
  return mergeUtmIntoUrl(originalUrl.trim(), normalized);
};
