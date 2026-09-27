import { createBrowserClient } from "@supabase/ssr";

// Browser requests use the same-origin proxy to avoid client-side network and CORS interference.
export const createClient = () => {
  const url = typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_SUPABASE_PROXY_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!
    : process.env.NEXT_PUBLIC_SUPABASE_PROXY_URL ?? `${window.location.origin}/api/supabase`;
  return createBrowserClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
};
