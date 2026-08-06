// Environment validation for the frontend.
//
// The Supabase URL/anon key are baked in for this deployment (they are
// public by design — RLS protects the data). Production deploys should set
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY instead; this module falls back
// to the baked-in values and logs a warning so a misconfigured build is
// noticed instead of silently using the wrong project.

const FALLBACK_URL = "https://ahpmeszqhkghwlrnoira.supabase.co";
const FALLBACK_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFocG1lc3pxaGtnaHdscm5vaXJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwMDI3NTQsImV4cCI6MjA2NTU3ODc1NH0.ZVbUQMGVdK0iKyp_7PMXlwBlglaIxtVlueGHzrWeVXI";

const isLikelyPlaceholder = (value: string) =>
  !value || value.includes("your-") || value.includes("changeme") || value.includes("xxx");

function resolveEnv(name: string, fallback: string, label: string): string {
  const value = import.meta.env[name] as string | undefined;
  if (value && !isLikelyPlaceholder(value)) return value;
  if (value && isLikelyPlaceholder(value)) {
    console.warn(`[env] ${label}: VITE var ${name} looks like a placeholder — using the built-in fallback.`);
  }
  return fallback;
}

export const env = {
  supabaseUrl: resolveEnv("VITE_SUPABASE_URL", FALLBACK_URL, "Supabase URL"),
  supabaseAnonKey: resolveEnv("VITE_SUPABASE_ANON_KEY", FALLBACK_ANON_KEY, "Supabase anon key"),
};
