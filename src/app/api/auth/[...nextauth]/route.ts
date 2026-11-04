import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions, getAuthConfigurationStatus } from "@/lib/server/auth";
import { jsonResponse } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const nextAuthHandler = NextAuth(authOptions);

async function handler(request: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  if (!getAuthConfigurationStatus().ready) {
    return jsonResponse({ error: "El acceso con Google todavía no está configurado.", code: "AUTH_NOT_CONFIGURED" }, 503);
  }
  return nextAuthHandler(request, context);
}

export { handler as GET, handler as POST };
