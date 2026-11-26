import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cookieOptions, serverSupabaseUrl, supabaseAnonKey } from "./config";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    serverSupabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions,
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component에서 호출된 경우 무시 (middleware가 세션을 갱신함)
          }
        },
      },
    },
  );
}
