import { errorResponse, HttpError, jsonResponse } from "@/lib/server/http";
import { massIdSchema } from "@/lib/server/schema";
import { readPublicPlaylist } from "@/lib/server/workspace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ massId: string }> }) {
  try {
    const parsed = massIdSchema.safeParse((await context.params).massId);
    if (!parsed.success) throw new HttpError(404, "No encontramos esta misa.", "MASS_NOT_FOUND");
    return jsonResponse({ playlist: await readPublicPlaylist(parsed.data) });
  } catch (error) {
    return errorResponse(error);
  }
}
