-- ============================================================
-- MIGRATION : Système de crédits
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- 1. Ajouter la colonne credits à pro_profiles
ALTER TABLE public.pro_profiles
  ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0;

-- 2. Table historique des transactions de crédits
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pro_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount            INTEGER NOT NULL,        -- positif = recharge, négatif = utilisation
  description       TEXT,
  stripe_session_id TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Un pro voit ses propres transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = pro_id);
