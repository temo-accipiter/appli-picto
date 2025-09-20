// src/services/userPrefsApi.js
// API fine pour lire/écrire user_prefs depuis ton code applicatif.
//
// ⚠️ Adapte l'import du client Supabase à ton projet ("/utils" vs "/supabase").
import { supabase } from "@/utils";

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user ?? null;
}

export async function getUserTimezone(userId) {
  const { data, error } = await supabase
    .from("user_prefs")
    .select("timezone")
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") throw error; // pas trouvé ≠ erreur
  return data?.timezone || "Europe/Paris";
}

export async function setUserTimezone(userId, timezone) {
  const { error } = await supabase
    .from("user_prefs")
    .upsert({ user_id: userId, timezone, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
  return true;
}
