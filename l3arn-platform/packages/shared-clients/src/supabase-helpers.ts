/**
 * Supabase helper utilities.
 *
 * Common query patterns and error handling for Supabase operations.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fetch the current user's profile from Supabase.
 */
export async function getCurrentProfile(supabase: SupabaseClient) {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (error) throw error;
    return data;
}

/**
 * Fetch tenant memberships for the current user.
 */
export async function getUserMemberships(supabase: SupabaseClient) {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from('tenant_memberships')
        .select('*, tenants(*)')
        .eq('user_id', user.id);

    if (error) throw error;
    return data ?? [];
}

/**
 * Wrap a Supabase query with a standardized error handler.
 */
export async function safeQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: unknown }>,
): Promise<T> {
    const { data, error } = await queryFn();

    if (error) {
        throw error;
    }

    if (data === null) {
        throw new Error('Query returned no data');
    }

    return data;
}
