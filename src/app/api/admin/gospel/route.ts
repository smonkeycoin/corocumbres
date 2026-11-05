import { getTargetSunday } from "@/lib/sunday-gospel";
import { getAdminAccess } from "@/lib/supabase/auth";
import { DENIED_MESSAGE } from "@/lib/supabase/auth-policy";
import { readGospelEditor, saveGospelTitle } from "@/lib/server/gospel";
import { HttpError, assertSameOrigin, errorResponse, jsonResponse, readJsonBody } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireAdmin() {
  const access = await getAdminAccess();
  if (access.status === "admin") return access.user;
  if (access.status === "unconfigured" || access.status === "unavailable") throw new HttpError(503, "No se pudo verificar el acceso administrativo.", "AUTH_UNAVAILABLE");
  if (access.status === "anonymous") throw new HttpError(401, "Inicia sesión para continuar.", "AUTH_REQUIRED");
  throw new HttpError(403, DENIED_MESSAGE, "ADMIN_REQUIRED");
}

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
    const user = await requireAdmin();
    assertSameOrigin(request);
    return jsonResponse(await saveGospelTitle(await readJsonBody(request, 4096), user.id));
  } catch (error) {
    return errorResponse(error);
  }
}
