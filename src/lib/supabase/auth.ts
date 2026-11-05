import "server-only";
import { createClient } from "./server";
import { hasVerifiedGoogleIdentity } from "./auth-policy";

export async function getAdminAccess() {
  const client = await createClient();
  if (!client) return { status: "unconfigured" as const };
  try {
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return { status: "anonymous" as const };
    if (!hasVerifiedGoogleIdentity(user)) return { status: "denied" as const };
    const membership = await client.rpc("is_admin");
    if (membership.error) return { status: "unavailable" as const };
    if (membership.data !== true) return { status: "denied" as const };
    return { status: "admin" as const, user };
  } catch { return { status: "unavailable" as const }; }
}
