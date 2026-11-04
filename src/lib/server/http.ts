import "server-only";
import { z } from "zod";

export class HttpError extends Error {
  constructor(public readonly status: number, message: string, public readonly code = "REQUEST_FAILED") {
    super(message);
    this.name = "HttpError";
  }
}

export const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
  "Vary": "Cookie",
};

export function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, { status, headers: privateHeaders });
}

export function errorResponse(error: unknown) {
  if (error instanceof HttpError) {
    return jsonResponse({ error: error.message, code: error.code }, error.status);
  }
  if (error instanceof z.ZodError || error instanceof SyntaxError) {
    return jsonResponse({ error: "Los datos enviados no tienen un formato válido.", code: "INVALID_DATA" }, 400);
  }
  // Do not return provider errors, tokens, email addresses or internal paths.
  console.error("CORO request failed", error instanceof Error ? error.name : "UnknownError");
  return jsonResponse({ error: "No pudimos completar la operación. Intenta nuevamente.", code: "INTERNAL_ERROR" }, 500);
}

/** Session cookies alone are insufficient for CSRF protection of our own APIs. */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const configuredOrigin = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).origin : null;
  const requestOrigin = new URL(request.url).origin;
  if (!origin || (origin !== requestOrigin && origin !== configuredOrigin)) {
    throw new HttpError(403, "Solicitud de otro origen no permitida.", "INVALID_ORIGIN");
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    throw new HttpError(403, "Solicitud de otro origen no permitida.", "INVALID_ORIGIN");
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "Envía los datos en formato JSON.", "INVALID_CONTENT_TYPE");
  }
}

export async function readJsonBody(request: Request, maxBytes = 3_000_000): Promise<unknown> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > maxBytes) {
    throw new HttpError(413, "El archivo supera el tamaño permitido.", "BODY_TOO_LARGE");
  }
  if (!request.body) throw new HttpError(400, "Faltan los datos de la solicitud.", "INVALID_DATA");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "El archivo supera el tamaño permitido.", "BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}
