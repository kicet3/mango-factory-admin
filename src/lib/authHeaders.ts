import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_CONFIG } from '@/config/supabase';

// 중앙에서 Supabase 인증/보안 헤더를 생성합니다.
// - Authorization: Bearer <JWT>
// - apikey: Supabase anon key (REST/Functions에서 요구)
export async function getSupabaseAuthHeaders(extra?: Record<string, string>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  // Get API key from the configured Supabase client instead of hardcoding
  const SUPABASE_ANON_KEY = SUPABASE_CONFIG.anonKey;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.access_token}`,
    apikey: SUPABASE_ANON_KEY,
  };

  return { ...headers, ...(extra || {}) } as Record<string, string>;
}
