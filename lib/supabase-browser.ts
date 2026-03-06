import { createClient } from '@supabase/supabase-js';

// Client Supabase pour les composants client (browser)
// Utilise la clé anon publique (sécurisée par RLS)
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
