import { requireAdmin } from "@/lib/server/auth";
import { assertSameOrigin, errorResponse, jsonResponse, readJsonBody } from "@/lib/server/http";
import { importRequestSchema } from "@/lib/server/schema";
import { importWorkspace } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    assertSameOrigin(request);
    const { songs, sets, etag } = importRequestSchema.parse(await readJsonBody(request));
    return jsonResponse(await importWorkspace(songs, sets, etag, session.user.email!));
  } catch (error) {
    return errorResponse(error);
  }
}
