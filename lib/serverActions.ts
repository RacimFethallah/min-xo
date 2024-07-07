// lib/serverActions.ts
"use server";

import { createClient } from "@/utils/supabase/server";

export async function initSupabaseClient() {
  return createClient();
}
