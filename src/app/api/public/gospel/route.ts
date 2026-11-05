import { getTargetSunday } from "@/lib/sunday-gospel";
import { readPublicGospel } from "@/lib/server/gospel";
import { errorResponse, jsonResponse } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const date = new URL(request.url).searchParams.get("date") ?? getTargetSunday(new Date());
    return jsonResponse(await readPublicGospel(date));
  } catch (error) {
    return errorResponse(error);
  }
}
