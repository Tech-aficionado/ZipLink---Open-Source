import { NextResponse } from "next/server";
import { getAuthFromRequest, getFirestore } from "@/lib/firebaseAdmin";
import { errorResponse } from "@/lib/http";
import { ImportNotFoundError, processOwnedImportJob } from "@/lib/importJobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

const json = (body: unknown, status = 200): NextResponse =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const owner = await getAuthFromRequest(req);
    const { jobId } = await context.params;
    return json(await processOwnedImportJob(getFirestore(), owner, jobId));
  } catch (error) {
    if (error instanceof ImportNotFoundError) return json({ error: error.message }, 404);
    const response = errorResponse(error, { log: false });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
