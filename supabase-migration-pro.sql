-- ============================================================
-- MIGRATION : Espace Professionnel Géodiag
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- 1. Table des profils professionnels
CREATE TABLE IF NOT EXISTS public.pro_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company     TEXT,
  siret       TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. Table des achats de leads par les pros
CREATE TABLE IF NOT EXISTS public.lead_purchases (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pro_id            UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id           UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE,
  paid_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pro_id, lead_id)
);

-- 3. Row Level Security : pro_profiles
ALTER TABLE public.pro_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Un pro voit uniquement son profil"
  ON public.pro_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Un pro peut mettre à jour son profil"
  ON public.pro_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Un pro peut créer son profil"
  ON public.pro_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 4. Row Level Security : lead_purchases
ALTER TABLE public.lead_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Un pro voit ses propres achats"
  ON public.lead_purchases FOR SELECT
  USING (auth.uid() = pro_id);

CREATE POLICY "Insertion via service role uniquement"
  ON public.lead_purchases FOR INSERT
  WITH CHECK (false); -- inserts uniquement via service_role (API)

-- 5. Accès en lecture aux leads (données masquées gérées côté app)
-- Les pros authentifiés peuvent LIRE les leads (le masquage est fait dans le code)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pros authentifiés voient les leads (masqués)"
  ON public.leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Insertion leads depuis la plateforme"
  ON public.leads FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- GOOGLE OAUTH : À configurer dans Supabase Dashboard
-- Authentication > Providers > Google
-- Redirect URL: http://localhost:3000/pro/auth/callback
-- ============================================================
