/**
 * Supabase client bootstrap.
 *
 * Creates and exports a single Supabase client instance
 * configured from environment variables.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        '[L3ARN] Missing Supabase env vars. Auth will not work until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.',
    );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
