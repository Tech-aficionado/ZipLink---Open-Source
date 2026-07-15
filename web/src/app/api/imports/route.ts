import { NextResponse } from "next/server";
import { getAuthFromRequest, getFirestore } from "@/lib/firebaseAdmin";
import { errorResponse } from "@/lib/http";
import {
  ImportRequestError,
  createImportJob,
  listOwnedImportJobs,
} from "@/lib/importJobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const json = (body: unknown, status = 200): NextResponse =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

const noStoreError = (error: unknown): NextResponse => {
  const response = errorResponse(error, { log: false });
  response.headers.set("Cache-Control", "no-store");
  return response;
};

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { uid } = await getAuthFromRequest(req);
    const jobs = await listOwnedImportJobs(getFirestore(), uid);
    return json({ jobs });
  } catch (error) {
    return noStoreError(error);
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const owner = await getAuthFromRequest(req);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const records = Array.isArray(body)
      ? body
      : typeof body === "object" && body !== null && !Array.isArray(body)
        ? (body as Record<string, unknown>).records
        : undefined;
    const job = await createImportJob(getFirestore(), owner, records);
    return json(job, 201);
  } catch (error) {
    if (error instanceof ImportRequestError) return json({ error: error.message }, 400);
    return noStoreError(error);
  }
}
