import { createClient } from "@/lib/supabase/server";
import type { DBUser } from "./types";

/**
 * Returns the authenticated auth user + their profile row from `users`,
 * or null if not logged in. Profile may be null if the row hasn't been
 * provisioned yet.
 */
export async function getSessionUser(): Promise<{
  authId: string;
  email: string;
  profile: DBUser | null;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    authId: user.id,
    email: user.email ?? "",
    profile: (profile as DBUser) ?? null,
  };
}
