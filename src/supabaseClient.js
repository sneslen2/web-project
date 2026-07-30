import { createClient } from '@supabase/supabase-js'

// Supabase project credentials.
//
// The publishable key is safe to ship in a client-side bundle -- that is what
// it is for. It grants only the `anon` role (or `authenticated`, once a user
// logs in), so what it can actually touch is decided entirely by the Row Level
// Security policies on each table. See supabase-schema.sql for those policies.
//
// Never put the *secret* key (sb_secret_... / service_role) in this file. That
// one bypasses RLS and would give anyone reading the bundle full database
// access.
//
// To rotate: replace SUPABASE_PUBLISHABLE_KEY below and rebuild.
const SUPABASE_URL = 'https://lskobysyxbngryxzkxez.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_uHOWKmQ9xv8ToIM0aBpHyA_4_AnT_M9'

// One shared client for the whole app. Creating multiple clients would mean
// multiple competing auth listeners writing the same localStorage session.
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    // Keep the session in localStorage and refresh it in the background so a
    // reload doesn't log the user out.
    persistSession: true,
    autoRefreshToken: true,
    // The app is served from a static host under a hash route (/#/login), so
    // there is no server to handle an OAuth redirect's query string. Email +
    // password needs no URL detection, so leave it off.
    detectSessionInUrl: false,
  },
})
