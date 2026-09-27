import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { profileFromLocalSession } from "@/lib/local-auth";
import type { Profile } from "@/lib/types";
export async function getSessionProfile(): Promise<{ userId: string; profile: Profile }> { const store = await cookies(); const localProfile = profileFromLocalSession(store.get("studioops_local_session")?.value); if (localProfile) return { userId: localProfile.id, profile: localProfile }; const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect("/login"); const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single(); if (!data) redirect("/login"); return { userId: user.id, profile: data as Profile }; }
export async function requireOwner() { const auth = await getSessionProfile(); if (auth.profile.role !== "owner") redirect("/dashboard"); return auth; }
