import { requireAdmin } from "@/lib/server/auth";
import { assertSameOrigin, errorResponse, jsonResponse, readJsonBody } from "@/lib/server/http";
import { saveRequestSchema } from "@/lib/server/schema";
import { readWorkspace, saveWorkspace } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    return jsonResponse(await readWorkspace());
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAdmin();
    assertSameOrigin(request);
    const { state, etag } = saveRequestSchema.parse(await readJsonBody(request));
    return jsonResponse(await saveWorkspace(state, etag, session.user.email!));
  } catch (error) {
    return errorResponse(error);
  }
}
