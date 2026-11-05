export const DENIED_MESSAGE = "Esta cuenta no tiene permisos de administración.";

// No host, protocol-relative URL, encoded separator, or auth route is accepted.
export function safeAuthRedirect(value: string | null | undefined): string {
  if (!value || /[\\\u0000-\u0020%]/.test(value) || !value.startsWith("/") || value.startsWith("//")) return "/admin";
  const parsed = new URL(value, "https://coro.invalid");
  if (!["/admin", "/admin/configuracion", "/presenter", "/display"].includes(parsed.pathname)) return "/admin";
  return `${parsed.pathname}${parsed.search}`;
}

export function hasVerifiedGoogleIdentity(user: {
  email_confirmed_at?: string | null;
  identities?: { provider: string }[];
} | null): boolean {
  return Boolean(user?.email_confirmed_at && user.identities?.some(identity => identity.provider === "google"));
}

export function isSameOriginPost(request: Request): boolean {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}
