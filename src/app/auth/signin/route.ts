import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSameOriginPost, safeAuthRedirect } from "@/lib/supabase/auth-policy";
import { getGoogleProviderStatus } from "@/lib/supabase/google-provider";

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) return new NextResponse("Solicitud no permitida.", { status: 403 });
  const client = await createClient();
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, request.url), 303);
  if (!client) return fail("configuration");
  const provider = await getGoogleProviderStatus();
  if (provider !== "ready") return fail(provider === "disabled" ? "google" : "provider");
  const form = await request.formData();
  const callback = new URL("/auth/callback", request.url);
  callback.searchParams.set("next", safeAuthRedirect(String(form.get("next") || "")));
  try {
    const { data, error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callback.toString(), skipBrowserRedirect: true, queryParams: { prompt: "select_account" } } });
    if (error || !data.url) return fail("oauth");
    const response = NextResponse.redirect(data.url, 303);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch { return fail("oauth"); }
}
