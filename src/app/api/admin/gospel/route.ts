import { getTargetSunday } from "@/lib/sunday-gospel";
import { requireAdmin } from "@/lib/server/auth";
import { readGospelEditor, saveGospelTitle } from "@/lib/server/gospel";
import { assertSameOrigin, errorResponse, jsonResponse, readJsonBody } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const date = new URL(request.url).searchParams.get("date") ?? getTargetSunday(new Date());
    return jsonResponse(await readGospelEditor(date));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAdmin();
    assertSameOrigin(request);
    return jsonResponse(await saveGospelTitle(await readJsonBody(request, 4096), session.user.email!));
  } catch (error) {
    return errorResponse(error);
  }
}
