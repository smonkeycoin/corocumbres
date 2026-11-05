import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasVerifiedGoogleIdentity, safeAuthRedirect } from "@/lib/supabase/auth-policy";

export async function GET(request: NextRequest) {
  const redirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  const client = await createClient();
  if (!client) return redirect("/login?error=configuration");
  const code = request.nextUrl.searchParams.get("code");
  if (!code || request.nextUrl.searchParams.has("error")) return redirect("/login?error=oauth");
  try {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) return redirect("/login?error=oauth");
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError || !user) return redirect("/login?error=oauth");
    if (!hasVerifiedGoogleIdentity(user)) return redirect("/login?error=denied");
    const membership = await client.rpc("is_admin");
    if (membership.error) return redirect("/login?error=unavailable");
    if (membership.data !== true) return redirect("/login?error=denied");
    return redirect(safeAuthRedirect(request.nextUrl.searchParams.get("next")));
  } catch { return redirect("/login?error=oauth"); }
}
