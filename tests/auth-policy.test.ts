import test from "node:test";
import assert from "node:assert/strict";
import { safeAuthRedirect, hasVerifiedGoogleIdentity, isSameOriginPost, DENIED_MESSAGE } from "../src/lib/supabase/auth-policy";

test("OAuth callback accepts only known internal destinations", () => {
  assert.equal(safeAuthRedirect("/admin?set=one"), "/admin?set=one");
  assert.equal(safeAuthRedirect("/presenter"), "/presenter");
  for (const unsafe of ["https://evil.test", "//evil.test", "/\\evil.test", "/%2fevil.test", "/auth/callback", "/login", "/admin/../../login", "/admin\n", "javascript:alert(1)", undefined]) assert.equal(safeAuthRedirect(unsafe), "/admin");
});

test("Google identity and confirmed email are prerequisites, never authorization by email alone", () => {
  assert.equal(hasVerifiedGoogleIdentity(null), false);
  assert.equal(hasVerifiedGoogleIdentity({ email_confirmed_at: "2026-01-01" }), false);
  assert.equal(hasVerifiedGoogleIdentity({ identities: [{ provider: "google" }] }), false);
  assert.equal(hasVerifiedGoogleIdentity({ email_confirmed_at: "2026-01-01", identities: [{ provider: "email" }] }), false);
  assert.equal(hasVerifiedGoogleIdentity({ email_confirmed_at: "2026-01-01", identities: [{ provider: "google" }] }), true);
  assert.equal(DENIED_MESSAGE, "Esta cuenta no tiene permisos de administración.");
});

test("signin/logout reject cross-origin and originless posts", () => {
  const request = (origin?: string) => new Request("https://corocumbres.online/auth/signout", { method: "POST", headers: origin ? { origin } : {} });
  assert.equal(isSameOriginPost(request("https://corocumbres.online")), true);
  assert.equal(isSameOriginPost(request("https://evil.test")), false);
  assert.equal(isSameOriginPost(request()), false);
});
