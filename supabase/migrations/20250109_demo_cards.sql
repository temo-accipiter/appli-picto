-- Migration: Créer la table demo_cards pour les cartes de démonstration
-- Description: Table pour stocker les tâches et récompenses de démonstration pour les visiteurs

-- Créer la table demo_cards
CREATE TABLE IF NOT EXISTS public.demo_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_type TEXT NOT NULL CHECK (card_type IN ('task', 'reward')),
  label TEXT NOT NULL,
  imagepath TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Créer un index sur card_type pour les requêtes de filtrage
CREATE INDEX IF NOT EXISTS idx_demo_cards_card_type ON public.demo_cards(card_type);

-- Créer un index sur is_active pour les requêtes de filtrage
CREATE INDEX IF NOT EXISTS idx_demo_cards_is_active ON public.demo_cards(is_active);

-- Créer un index sur position pour le tri
CREATE INDEX IF NOT EXISTS idx_demo_cards_position ON public.demo_cards(position);

-- Activer RLS (Row Level Security)
ALTER TABLE public.demo_cards ENABLE ROW LEVEL SECURITY;

-- Politique de lecture : tout le monde peut lire les cartes actives (visiteurs inclus)
CREATE POLICY "Tout le monde peut lire les cartes actives"
  ON public.demo_cards
  FOR SELECT
  USING (is_active = true);

-- Politique de lecture admin : les admins peuvent tout voir
CREATE POLICY "Les admins peuvent tout voir"
  ON public.demo_cards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Politique d'insertion : seuls les admins peuvent insérer
CREATE POLICY "Seuls les admins peuvent insérer"
  ON public.demo_cards
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Politique de mise à jour : seuls les admins peuvent mettre à jour
CREATE POLICY "Seuls les admins peuvent mettre à jour"
  ON public.demo_cards
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Politique de suppression : seuls les admins peuvent supprimer
CREATE POLICY "Seuls les admins peuvent supprimer"
  ON public.demo_cards
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION public.update_demo_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour appeler la fonction avant chaque UPDATE
CREATE TRIGGER update_demo_cards_updated_at_trigger
  BEFORE UPDATE ON public.demo_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_demo_cards_updated_at();

-- Insérer des données de démonstration par défaut
INSERT INTO public.demo_cards (card_type, label, position, is_active) VALUES
  ('task', 'Se brosser les dents', 0, true),
  ('task', 'Ranger son cartable', 1, true),
  ('task', 'Prendre son goûter', 2, true),
  ('reward', '15 min de jeu', 0, true)
ON CONFLICT DO NOTHING;

-- Commentaires sur la table et les colonnes
COMMENT ON TABLE public.demo_cards IS 'Cartes de démonstration pour les visiteurs (tâches et récompenses prédéfinies)';
COMMENT ON COLUMN public.demo_cards.card_type IS 'Type de carte : task (tâche) ou reward (récompense)';
COMMENT ON COLUMN public.demo_cards.label IS 'Libellé de la carte';
COMMENT ON COLUMN public.demo_cards.imagepath IS 'Chemin de l''image associée (optionnel)';
COMMENT ON COLUMN public.demo_cards.position IS 'Position de la carte pour le tri';
COMMENT ON COLUMN public.demo_cards.is_active IS 'Indique si la carte est active et visible';
