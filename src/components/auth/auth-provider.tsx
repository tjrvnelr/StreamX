import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue } from './auth-context'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<NonNullable<AuthContextValue['user']> | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setUser(data.session?.user ?? null)
        setLoading(false)
      }
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    configured: isSupabaseConfigured,
    signOut: async () => { if (supabase) await supabase.auth.signOut() },
  }), [user, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
