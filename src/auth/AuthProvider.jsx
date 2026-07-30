import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient.js'

const AuthContext = createContext(null)

/**
 * Holds the current Supabase session and exposes the auth actions.
 *
 * Wrap the app in this once (see main.jsx), then read it anywhere with
 * useAuth().
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  // Starts true: until we've asked Supabase whether a session exists in
  // localStorage, we genuinely don't know if the user is logged in. Rendering
  // routes during this window would bounce a signed-in user to /login on every
  // refresh.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    // 1. Restore whatever session is already persisted.
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) console.error('Failed to restore session:', error.message)
      setSession(data?.session ?? null)
      setLoading(false)
    })

    // 2. Then keep it current -- fires on sign in, sign out, token refresh,
    //    and on changes made in another browser tab.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,

      /** Create an account. Returns { error } -- null on success. */
      async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({ email, password })
        // When email confirmation is ON, Supabase returns a user but no
        // session: the account exists but can't act until the link is clicked.
        // Report that back so the UI can say so instead of silently "working".
        const needsEmailConfirmation = !error && !data.session
        return { error, needsEmailConfirmation }
      },

      /** Sign in with email + password. Returns { error } -- null on success. */
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        return { error }
      },

      /** Sign out and clear the persisted session. */
      async signOut() {
        const { error } = await supabase.auth.signOut()
        return { error }
      },
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used inside an <AuthProvider>')
  }
  return context
}
