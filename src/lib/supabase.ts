/**
 * Supabase Client Configuration
 * 
 * This replaces the previous Firebase configuration.
 * - supabase: Client-side usage (browser)
 * - supabaseAdmin: Server-side usage (API routes) - has elevated privileges
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables
// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

// Validate required environment variables
// Note: We don't throw immediately to allow build process to pass even if env vars are missing
// (Vercel build might check imports)
if (supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-key') {
    console.warn('⚠️ Supabase environment variables are missing. This is fine specifically during build time if not using static generation with DB calls.');
}

/**
 * Browser/Client-side Supabase client
 * Uses anon key - respects Row Level Security (RLS)
 * Implements singleton pattern to prevent multiple instances during development
 */
const createBrowserClient = () => createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
    },
    global: {
        fetch: (url, options = {}) => {
            return fetch(url, {
                ...options,
                // Increase timeout to 60 seconds for cold starts
                signal: AbortSignal.timeout(60000),
            });
        },
    },
});

// Use global variable to store client in development to prevent multiple instances on HMR
const globalForSupabase = global as unknown as { supabase: SupabaseClient };

export const supabase = globalForSupabase.supabase || createBrowserClient();

if (process.env.NODE_ENV !== 'production') {
    globalForSupabase.supabase = supabase;
}

/**
 * Server-side Supabase client (for API routes)
 * Uses service role key - bypasses Row Level Security
 * ⚠️ ONLY use in server-side code (API routes, server components)
 */
export const supabaseAdmin: SupabaseClient = createClient(
    supabaseUrl,
    supabaseServiceRoleKey || supabaseAnonKey,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
        global: {
            fetch: (url, options = {}) => {
                return fetch(url, {
                    ...options,
                    // Increase timeout to 60 seconds for cold starts
                    signal: AbortSignal.timeout(60000),
                });
            },
        },
    }
);

/**
 * Helper function to check if we're on server-side
 */
export const isServer = typeof window === 'undefined';

/**
 * Get the appropriate Supabase client based on environment
 */
export function getSupabaseClient(): SupabaseClient {
    return isServer ? supabaseAdmin : supabase;
}

// Export types for convenience
export type { SupabaseClient };
