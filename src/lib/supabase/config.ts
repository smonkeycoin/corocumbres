export const CONFIGURATION_MESSAGE = "El servicio de CORO CUMBRES todavía no está configurado. Inténtalo más tarde.";

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || key.startsWith("sb_secret_")) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname))) return null;
    if (!key.startsWith("sb_publishable_")) {
      const payload = JSON.parse(atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
      if (payload.role !== "anon") return null;
    }
    return { url, key };
  } catch { return null; }
}
