/**
 * API client wrapper with automatic bearer token injection.
 *
 * All requests to the FastAPI backend go through this client.
 * It reads the current Supabase session and attaches the JWT
 * as a Bearer token in the Authorization header.
 */
import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

interface ApiOptions {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiClient<T = unknown>(
    path: string,
    options: ApiOptions = {},
): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    const authHeaders = await getAuthHeaders();

    const response = await fetch(`${API_BASE}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
            ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API ${method} ${path} failed (${response.status}): ${errorBody}`);
    }

    return response.json() as Promise<T>;
}

// Convenience methods
export const api = {
    get: <T = unknown>(path: string) => apiClient<T>(path),
    post: <T = unknown>(path: string, body: unknown) =>
        apiClient<T>(path, { method: 'POST', body }),
    put: <T = unknown>(path: string, body: unknown) =>
        apiClient<T>(path, { method: 'PUT', body }),
    delete: <T = unknown>(path: string) =>
        apiClient<T>(path, { method: 'DELETE' }),
};
