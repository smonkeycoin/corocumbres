"use client";

import { createBrowserClient } from "@supabase/ssr";
import { CONFIGURATION_MESSAGE, getSupabaseConfig } from "./config";

export function createClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error(CONFIGURATION_MESSAGE);
  return createBrowserClient(config.url, config.key);
}
