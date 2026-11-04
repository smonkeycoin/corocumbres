import "server-only";
import { getServerSession, type DefaultSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { HttpError } from "./http";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      role: "ADMIN" | "PUBLIC";
      googleVerified: boolean;
    };
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isAllowedAdminEmail(email: unknown): boolean {
  if (typeof email !== "string" || !email) return false;
  const allowed = (process.env.CORO_ADMIN_EMAILS ?? "")
    .split(/[\s,;]+/)
    .map(normalizeEmail)
    .filter(Boolean);
  return allowed.includes(normalizeEmail(email));
}

export function getAuthConfigurationStatus() {
  const missing: string[] = [];
  if (!(process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID)) missing.push("AUTH_GOOGLE_ID");
  if (!(process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET)) missing.push("AUTH_GOOGLE_SECRET");
  if (!(process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET)) missing.push("AUTH_SECRET");
  if (!(process.env.CORO_ADMIN_EMAILS ?? "").trim()) missing.push("CORO_ADMIN_EMAILS");
  if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_URL) missing.push("NEXTAUTH_URL");
  return { ready: missing.length === 0, missing };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  jwt: { maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: { params: { prompt: "select_account", scope: "openid email profile" } },
      checks: ["pkce", "state", "nonce"],
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      const verified = profile && "email_verified" in profile && profile.email_verified === true;
      return getAuthConfigurationStatus().ready && account?.provider === "google" && Boolean(verified) && isAllowedAdminEmail(profile?.email);
    },
    async jwt({ token, account, profile }) {
      // Never trust client-provided session updates. Only the verified OAuth callback sets these claims.
      if (account) {
        token.authProvider = account.provider;
        token.googleVerified = account.provider === "google" && Boolean(profile && "email_verified" in profile && profile.email_verified === true);
        token.googleSubject = profile?.sub;
        token.email = typeof profile?.email === "string" ? normalizeEmail(profile.email) : null;
      }
      return token;
    },
    async session({ session, token }) {
      const verified = token.authProvider === "google" && token.googleVerified === true && typeof token.googleSubject === "string" && token.googleSubject.length > 0;
      session.user = {
        name: session.user?.name,
        image: session.user?.image,
        email: typeof token.email === "string" ? token.email : null,
        googleVerified: verified,
        // Re-evaluate the current server allowlist on every request, including existing sessions.
        role: verified && isAllowedAdminEmail(token.email) ? "ADMIN" : "PUBLIC",
      };
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/") && !url.startsWith("//")) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === new URL(baseUrl).origin) return url;
      } catch { /* Invalid callback targets return to the workspace. */ }
      return `${baseUrl}/admin`;
    },
  },
  logger: {
    error(code) { console.error("CORO authentication error", code); },
    warn(code) { console.warn("CORO authentication warning", code); },
    debug() { /* Never log authentication payloads. */ },
  },
};

export async function getAdminSession() {
  if (!getAuthConfigurationStatus().ready) return null;
  const session = await getServerSession(authOptions);
  return session?.user?.role === "ADMIN" && session.user.googleVerified ? session : null;
}

export async function requireAdmin() {
  if (!getAuthConfigurationStatus().ready) {
    throw new HttpError(503, "El acceso administrativo todavía no está configurado.", "AUTH_NOT_CONFIGURED");
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new HttpError(401, "Inicia sesión con Google para continuar.", "UNAUTHENTICATED");
  if (session.user.role !== "ADMIN" || !session.user.googleVerified || !isAllowedAdminEmail(session.user.email)) {
    throw new HttpError(403, "Esta cuenta no tiene acceso administrativo.", "FORBIDDEN");
  }
  return session;
}
