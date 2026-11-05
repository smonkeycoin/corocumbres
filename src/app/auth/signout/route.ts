import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSameOriginPost } from "@/lib/supabase/auth-policy";

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) return new NextResponse("Solicitud no permitida.", { status: 403 });
  const client = await createClient();
  if (client) {
    try {
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) return NextResponse.redirect(new URL("/login?error=logout", request.url), 303);
    } catch { return NextResponse.redirect(new URL("/login?error=logout", request.url), 303); }
  }
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
