import { createClient } from '@supabase/supabase-js';

// Variáveis de ambiente públicas do Supabase (Vite)
const rawUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://demo-placeholder.supabase.co').trim();
// Remove automaticamente /rest/v1, /rest/v1/ ou barras finais para garantir funcionamento de Auth e Realtime
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-anon-key-placeholder').trim();

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_ANON_KEY &&
  !import.meta.env.VITE_SUPABASE_URL.includes('demo-placeholder')
);

// Cliente oficial Singleton do Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export default supabase;

