import { auth } from "@/lib/firebaseClient";

export type LinkStatus = "active" | "scheduled" | "paused" | "expired" | "error";

export interface UtmValues {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
}

export interface LinkItem {
  shortCode: string;
  originalUrl: string;
  shortUrl: string;
  clicks: number;
  createdAt: string | null;
  lastAccessedAt: string | null;
  enabled: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  status: LinkStatus;
  tags: string[];
  utm: UtmValues | null;
}

export interface CreateLinkOptions {
  originalUrl: string;
  customCode?: string;
  enabled?: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
  tags?: string[];
  utm?: UtmValues | null;
}

export interface LinkUpdates {
  originalUrl?: string;
  enabled?: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
  tags?: string[];
  utm?: UtmValues | null;
}

interface ListLinksResponse {
  links: LinkItem[];
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const SHORT_BASE_URL =
  process.env.NEXT_PUBLIC_SHORT_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "";

export function baseHostPrefix(): string {
  const raw = SHORT_BASE_URL.trim();
  if (!raw) return "/";
  const withoutProtocol = raw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `${withoutProtocol}/`;
}

export const ALIAS_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;
const REQUEST_TIMEOUT_MS = 15000;

async function authHeaders(): Promise<HeadersInit> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new ApiError("You must be signed in to do that.", 401);
  try {
    return { Authorization: `Bearer ${await currentUser.getIdToken()}` };
  } catch {
    throw new ApiError("Couldn't verify your session. Please sign in again.", 401);
  }
}

async function parseError(response: Response): Promise<never> {
  let message = `Request failed with status ${response.status}`;
  try {
    const data = (await response.json()) as { error?: string };
    if (data && typeof data.error === "string" && data.error.length > 0) message = data.error;
  } catch {
    // The response had no JSON body.
  }
  throw new ApiError(message, response.status);
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(path, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("The request timed out. Please try again.", 0);
    }
    throw new ApiError("Network error. Check your connection and try again.", 0);
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) await parseError(response);
  return response;
}

export async function createLink(options: CreateLinkOptions): Promise<LinkItem> {
  const headers = await authHeaders();
  const payload: CreateLinkOptions = { ...options, originalUrl: options.originalUrl.trim() };
  if (payload.customCode) payload.customCode = payload.customCode.trim();
  const response = await request("/api/links", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await response.json()) as LinkItem;
}

export async function listLinks(): Promise<LinkItem[]> {
  const headers = await authHeaders();
  const response = await request("/api/links", { method: "GET", headers });
  const data = (await response.json()) as ListLinksResponse;
  return data.links ?? [];
}

export async function deleteLink(shortCode: string): Promise<void> {
  const headers = await authHeaders();
  await request(`/api/links/${encodeURIComponent(shortCode)}`, { method: "DELETE", headers });
}

export async function updateLink(shortCode: string, updates: LinkUpdates): Promise<LinkItem> {
  const headers = await authHeaders();
  const response = await request(`/api/links/${encodeURIComponent(shortCode)}`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  return (await response.json()) as LinkItem;
}

/* -------------------------------------------------------------------------- */
/* Analytics                                                                  */
/* -------------------------------------------------------------------------- */

export interface Bucket {
  label: string;
  value: number;
}
export interface SeriesPoint {
  date: string;
  count: number;
}
export interface Analytics {
  total: number;
  last7: number;
  last30: number;
  series: SeriesPoint[];
  devices: Bucket[];
  browsers: Bucket[];
  referrers: Bucket[];
  countries: Bucket[];
}
export interface TopLink {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  clicks: number;
}
export interface OverviewAnalytics {
  totalLinks: number;
  totalClicks: number;
  topLinks: TopLink[];
  analytics: Analytics;
}
export interface LinkAnalytics {
  link: LinkItem;
  analytics: Analytics;
}

/** Account-wide analytics overview for the current user. */
export async function getOverview(): Promise<OverviewAnalytics> {
  const headers = await authHeaders();
  const response = await request(`/api/analytics/overview`, { headers });
  return (await response.json()) as OverviewAnalytics;
}

/** Analytics for a single link owned by the current user. */
export async function getLinkAnalytics(shortCode: string): Promise<LinkAnalytics> {
  const headers = await authHeaders();
  const response = await request(
    `/api/analytics/link/${encodeURIComponent(shortCode)}`,
    { headers },
  );
  return (await response.json()) as LinkAnalytics;
}


/* -------------------------------------------------------------------------- */
/* CSV imports                                                                */
/* -------------------------------------------------------------------------- */

export type ImportJobStatus = "pending" | "processing" | "completed";
export type ImportRowStatus = "pending" | "success" | "error" | "invalid";

export interface ImportRowOutcome {
  rowNumber: number;
  input: {
    originalUrl: string;
    customCode: string | null;
    tags: string[];
    enabled: boolean;
    startsAt: string | null;
    expiresAt: string | null;
    [key: string]: unknown;
  };
  status: ImportRowStatus;
  error: string | null;
  shortCode: string | null;
  shortUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ImportJob {
  jobId: string;
  status: ImportJobStatus;
  totalRows: number;
  processedRows: number;
  succeededRows: number;
  failedRows: number;
  nextRow: number;
  createdAt: string | null;
  updatedAt: string | null;
  outcomes?: ImportRowOutcome[];
}

export async function listImportJobs(): Promise<ImportJob[]> {
  const headers = await authHeaders();
  const response = await request("/api/imports", { headers });
  const data = (await response.json()) as { jobs?: ImportJob[] };
  return data.jobs ?? [];
}

export async function createImportJob(records: Record<string, unknown>[]): Promise<ImportJob> {
  const headers = await authHeaders();
  const response = await request("/api/imports", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ records }),
  });
  return (await response.json()) as ImportJob;
}

export async function getImportJob(jobId: string): Promise<ImportJob> {
  const headers = await authHeaders();
  const response = await request(`/api/imports/${encodeURIComponent(jobId)}`, { headers });
  return (await response.json()) as ImportJob;
}

export async function processImportJob(jobId: string): Promise<ImportJob> {
  const headers = await authHeaders();
  const response = await request(`/api/imports/${encodeURIComponent(jobId)}/process`, {
    method: "POST",
    headers,
  });
  return (await response.json()) as ImportJob;
}
