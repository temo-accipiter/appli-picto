// src/hooks/useUserTimezone.js
// Hook léger pour récupérer le timezone stocké dans user_prefs
// + helpers de formatage local sans toucher à tes composants.
//
// ⚠️ Adapte l'import du client Supabase à ton projet.
// Si ton client est exporté depuis "@/utils" (vu dans AuthContext.jsx), garde "@/utils".
// Si c'est "@/supabase", remplace l'import ci-dessous.
import { supabase } from "@/utils";

import { useEffect, useMemo, useState } from "react";

// Petite clé de cache localStorage par utilisateur
const storageKey = (userId) => `tz:${userId}`;

export function useUserTimezone() {
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchTz() {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user ?? null;
      if (!user) {
        // Visiteur non connecté : fallback Paris
        if (!cancelled) {
          setTimezone("Europe/Paris");
          setLoading(false);
        }
        return;
      }

      // Nettoyer le cache si l'utilisateur a changé
      const currentUserId = user.id;
      const cachedUserId = localStorage.getItem('current_user_id');
      if (cachedUserId && cachedUserId !== currentUserId) {
        // Utilisateur différent, nettoyer le cache
        localStorage.removeItem(storageKey(cachedUserId));
        localStorage.removeItem('quotas:' + cachedUserId);
      }
      localStorage.setItem('current_user_id', currentUserId);

      // 1) Essayer cache local
      const cached = localStorage.getItem(storageKey(user.id));
      if (cached && !cancelled) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed?.timezone) {
            setTimezone(parsed.timezone);
          }
        } catch {}
      }

      // 2) Lecture BDD user_prefs
      const { data, error } = await supabase
        .from("user_prefs")
        .select("timezone, updated_at")
        .eq("user_id", user.id)
        .single();

      if (!cancelled) {
        if (error) {
          // En cas d'erreur, ne bloque pas l'UI
          console.warn("useUserTimezone/read error:", error.message);
        }
        const tz = data?.timezone || "Europe/Paris";
        console.log('🌍 useUserTimezone:', { user_id: user.id, timezone: tz, data, error, timestamp: new Date().toISOString() });
        setTimezone(tz);
        setLoading(false);

        // Mettre à jour le cache
        try {
          localStorage.setItem(
            storageKey(user.id),
            JSON.stringify({ timezone: tz, updated_at: data?.updated_at || new Date().toISOString() })
          );
        } catch {}
      }
    }

    fetchTz();
    return () => {
      cancelled = true;
    };
  }, []);

  // Helpers
  const helpers = useMemo(() => {
    const toLocal = (date) => {
      const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
      // Retourne un nouvel objet Date correspondant à l'heure locale *affichée* (pas conversion destructive)
      // Pour l'affichage, préfère la fonction format() ci-dessous.
      return d;
    };

    const format = (date, options = {}) => {
      const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
      // Options par défaut pensées pour lisibilité (WCAG) et cohérence
      const fmt = new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: timezone,
        ...options,
      });
      return fmt.format(d);
    };

    return { toLocal, format };
  }, [timezone]);

  return { timezone, loading, ...helpers };
}
