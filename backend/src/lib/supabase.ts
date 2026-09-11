import { createClient } from '@supabase/supabase-js';
import { supabaseEnv } from '../config/env.js';

export const supabase = createClient(supabaseEnv.url, supabaseEnv.serviceKey, {
  auth: { persistSession: false },
});
