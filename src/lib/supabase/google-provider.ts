import "server-only";
import { getSupabaseConfig } from "./config";

/** Check the real provider before offering or starting OAuth; never infer it from API keys. */
export async function getGoogleProviderStatus() {
  const config = getSupabaseConfig();
  if (!config) return "unconfigured" as const;
  try {
    const response = await fetch(new URL("/auth/v1/settings", config.url), {
      headers: { apikey: config.key },
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return "unavailable" as const;
    const settings: unknown = await response.json();
    if (!settings || typeof settings !== "object" || !("external" in settings)) return "unavailable" as const;
    const external = settings.external;
    if (!external || typeof external !== "object" || !("google" in external)) return "unavailable" as const;
    if (external.google === true) return "ready" as const;
    return external.google === false ? "disabled" as const : "unavailable" as const;
  } catch {
    return "unavailable" as const;
  }
}
