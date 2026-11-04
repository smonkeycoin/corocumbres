import { requireAdmin } from "@/lib/server/auth";
import { assertSameOrigin, errorResponse, jsonResponse, readJsonBody } from "@/lib/server/http";
import { publishRequestSchema } from "@/lib/server/schema";
import { publishPlaylist } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    assertSameOrigin(request);
    const { massId, setId, etag } = publishRequestSchema.parse(await readJsonBody(request, 10_000));
    return jsonResponse(await publishPlaylist(massId, setId, etag, session.user.email!));
  } catch (error) {
    return errorResponse(error);
  }
}
