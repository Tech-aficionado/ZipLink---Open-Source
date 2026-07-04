import { auth } from "@/lib/firebaseClient";

/**
 * A single shortened link as returned by the API contract.
 */
export interface LinkItem {
  shortCode: string;
  originalUrl: string;
  shortUrl: string;
  clicks: number;
  createdAt: string | null;
  lastAccessedAt: string | null;
}

interface CreateLinkResponse {
  shortCode: string;
  shortUrl: string;
  originalUrl: string;
  clicks: number;
  createdAt: string | null;
}

interface ListLinksResponse {
  links: LinkItem[];
}

/**
 * Error thrown for any non-2xx API response. Carries the HTTP status so
 * callers can react to specific cases (e.g. a 503 when the backend/Firebase
 * Admin is not configured yet).
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Short-link domain (e.g. https://zl.ash-labs.tech), used only to display the
// alias prefix chip. Falls back to the app origin, then relative.
const SHORT_BASE_URL =
  process.env.NEXT_PUBLIC_SHORT_BASE_URL ?? process.env.NEXT_PUBLIC_BASE_URL ?? "";

/**
 * The display host used for the alias prefix chip (e.g. "zl.ash-labs.tech/").
 * Derived from the short-link domain: strips the protocol and trailing slash,
 * then appends a single "/". Falls back to "/" when unset.
 */
export function baseHostPrefix(): string {
  const raw = SHORT_BASE_URL.trim();
  if (!raw) return "/";
  const withoutProtocol = raw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return `${withoutProtocol}/`;
}

/** Client-side alias validation mirroring the server contract. */
export const ALIAS_PATTERN = /^[a-zA-Z0-9_-]{3,32}$/;

async function authHeaders(): Promise<HeadersInit> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new ApiError("You must be signed in to do that.", 401);
  }
  const token = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function parseError(response: Response): Promise<never> {
  let message = `Request failed with status ${response.status}`;
  try {
    const data = (await response.json()) as { error?: string };
    if (data && typeof data.error === "string" && data.error.length > 0) {
      message = data.error;
    }
  } catch {
    // Response had no JSON body; fall back to the default message.
  }
  throw new ApiError(message, response.status);
}

/**
 * Create a new short link for the given original URL.
 *
 * When {@link customCode} is provided (non-empty), it is sent as the desired
 * alias. Callers can inspect a thrown {@link ApiError} to react to specific
 * cases: 409 (alias already taken) and 400 (invalid/reserved alias).
 */
export async function createLink(
  originalUrl: string,
  customCode?: string,
): Promise<CreateLinkResponse> {
  const headers = await authHeaders();

  const payload: { originalUrl: string; customCode?: string } = { originalUrl };
  const alias = customCode?.trim();
  if (alias) {
    payload.customCode = alias;
  }

  const response = await fetch(`/api/links`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await parseError(response);
  }

  return (await response.json()) as CreateLinkResponse;
}

/**
 * List the current user's links, newest first.
 */
export async function listLinks(): Promise<LinkItem[]> {
  const headers = await authHeaders();
  const response = await fetch(`/api/links`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    await parseError(response);
  }

  const data = (await response.json()) as ListLinksResponse;
  return data.links ?? [];
}

/**
 * Delete one of the current user's links by short code.
 */
export async function deleteLink(shortCode: string): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(
    `/api/links/${encodeURIComponent(shortCode)}`,
    {
      method: "DELETE",
      headers,
    },
  );

  if (!response.ok && response.status !== 204) {
    await parseError(response);
  }
}
