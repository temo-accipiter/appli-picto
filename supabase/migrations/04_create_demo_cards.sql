-- =====================================================
-- MIGRATION 1.4 : Table des cartes de démonstration
-- =====================================================
-- Date: 2025-01-05
-- Description: Crée la table pour les cartes prédéfinies des visiteurs
-- 
-- Cette table contient des cartes de tâches et récompenses prédéfinies
-- que les visiteurs non connectés peuvent utiliser en mode démo
-- =====================================================

-- 1. Créer la table des cartes de démonstration
CREATE TABLE IF NOT EXISTS public.demo_cards (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    card_type text NOT NULL CHECK (card_type IN ('task', 'reward')),
    label text NOT NULL,
    imagepath text,
    "position" integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Insérer des cartes de démonstration par défaut
INSERT INTO public.demo_cards (card_type, label, imagepath, "position") VALUES
-- Tâches de démonstration
('task', 'Se brosser les dents', '/demo-images/brush-teeth.png', 1),
('task', 'Mettre son pyjama', '/demo-images/pajamas.png', 2),
('task', 'Lire une histoire', '/demo-images/read-book.png', 3),
('task', 'Ranger sa chambre', '/demo-images/tidy-room.png', 4),
('task', 'Se laver les mains', '/demo-images/wash-hands.png', 5),

-- Récompenses de démonstration
('reward', 'Regarder un dessin animé', '/demo-images/cartoon.png', 1),
('reward', 'Jouer avec un jouet', '/demo-images/toy.png', 2),
('reward', 'Manger un bonbon', '/demo-images/candy.png', 3),
('reward', 'Écouter de la musique', '/demo-images/music.png', 4),
('reward', 'Faire un câlin', '/demo-images/hug.png', 5)
ON CONFLICT DO NOTHING;

-- 3. Ajouter les index pour les performances
CREATE INDEX IF NOT EXISTS idx_demo_cards_type ON public.demo_cards (card_type);
CREATE INDEX IF NOT EXISTS idx_demo_cards_active ON public.demo_cards (is_active);
CREATE INDEX IF NOT EXISTS idx_demo_cards_position ON public.demo_cards ("position");

-- 4. RLS pour lecture publique
ALTER TABLE public.demo_cards ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture publique des cartes actives
CREATE POLICY "demo_cards_select_public" ON public.demo_cards
FOR SELECT USING (is_active = true);

-- Politique pour les admins (gestion complète)
CREATE POLICY "demo_cards_admin_all" ON public.demo_cards
FOR ALL USING (public.is_admin());

-- 5. Fonction pour obtenir les cartes de démonstration
CREATE OR REPLACE FUNCTION public.get_demo_cards(card_type_filter text DEFAULT NULL)
RETURNS TABLE(
    id uuid,
    card_type text,
    label text,
    imagepath text,
    "position" integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        dc.id,
        dc.card_type,
        dc.label,
        dc.imagepath,
        dc."position"
    FROM public.demo_cards dc
    WHERE dc.is_active = true
    AND (card_type_filter IS NULL OR dc.card_type = card_type_filter)
    ORDER BY dc."position", dc.created_at;
$$;

-- 6. Fonction pour obtenir les tâches de démonstration
CREATE OR REPLACE FUNCTION public.get_demo_tasks()
RETURNS TABLE(
    id uuid,
    label text,
    imagepath text,
    "position" integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        dc.id,
        dc.label,
        dc.imagepath,
        dc."position"
    FROM public.demo_cards dc
    WHERE dc.is_active = true
    AND dc.card_type = 'task'
    ORDER BY dc."position", dc.created_at;
$$;

-- 7. Fonction pour obtenir les récompenses de démonstration
CREATE OR REPLACE FUNCTION public.get_demo_rewards()
RETURNS TABLE(
    id uuid,
    label text,
    imagepath text,
    "position" integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT 
        dc.id,
        dc.label,
        dc.imagepath,
        dc."position"
    FROM public.demo_cards dc
    WHERE dc.is_active = true
    AND dc.card_type = 'reward'
    ORDER BY dc."position", dc.created_at;
$$;

-- 8. Commentaires pour la documentation
COMMENT ON TABLE public.demo_cards IS 'Cartes prédéfinies pour la démonstration aux visiteurs non connectés';
COMMENT ON COLUMN public.demo_cards.card_type IS 'Type de carte: task (tâche) ou reward (récompense)';
COMMENT ON COLUMN public.demo_cards."position" IS 'Ordre d''affichage des cartes';
COMMENT ON COLUMN public.demo_cards.is_active IS 'Si true, la carte est visible pour les visiteurs';

-- 9. Vérification de la migration
DO $$
DECLARE
    demo_cards_count integer;
    demo_tasks_count integer;
    demo_rewards_count integer;
BEGIN
    SELECT COUNT(*) INTO demo_cards_count FROM public.demo_cards;
    SELECT COUNT(*) INTO demo_tasks_count FROM public.demo_cards WHERE card_type = 'task';
    SELECT COUNT(*) INTO demo_rewards_count FROM public.demo_cards WHERE card_type = 'reward';
    
    RAISE NOTICE 'Migration 1.4 terminée:';
    RAISE NOTICE '- Table demo_cards créée';
    RAISE NOTICE '- Cartes de démonstration insérées: %', demo_cards_count;
    RAISE NOTICE '- Tâches de démo: %', demo_tasks_count;
    RAISE NOTICE '- Récompenses de démo: %', demo_rewards_count;
    RAISE NOTICE '- Fonctions créées: get_demo_cards, get_demo_tasks, get_demo_rewards';
    RAISE NOTICE '- RLS activé avec accès public en lecture';
END $$;
