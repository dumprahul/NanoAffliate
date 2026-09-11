import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

export const supabase =
  env.supabase.url && env.supabase.serviceKey
    ? createClient(env.supabase.url, env.supabase.serviceKey)
    : null;
