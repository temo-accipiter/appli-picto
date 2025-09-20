// frontend/src/services/saveUserTimezone.js
import { supabase } from "@/utils";

export async function saveUserTimezoneOnce() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris";
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // upsert dans user_prefs
  const { error } = await supabase
    .from("user_prefs")
    .upsert({ user_id: user.id, timezone: tz, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (error) {
    // Optionnel: log ou toast
    console.warn("saveUserTimezoneOnce error:", error.message);
  }
}
