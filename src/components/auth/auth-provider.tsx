import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { AuthContext, type AuthContextValue } from './auth-context'
import { isFirebaseConfigured, auth as firebaseAuth, db } from '../../lib/firebase'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(isFirebaseConfigured)

  useEffect(() => {
    if (!firebaseAuth) return
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser && db) {
        try {
          const profileRef = doc(db, 'profiles', firebaseUser.uid)
          const profileSnap = await getDoc(profileRef)
          if (!profileSnap.exists()) {
            const username = 'member_' + firebaseUser.uid.replace(/-/g, '').slice(0, 12)
            const displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'StreamX creator'
            await setDoc(profileRef, {
              username,
              displayName,
              avatarUrl: firebaseUser.photoURL || null,
              bio: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
          }
        } catch {
          // If Firestore is offline or security rules block, proceed with user state
        }
      }
      setUser(firebaseUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    configured: isFirebaseConfigured,
    signOut: async () => {
      if (firebaseAuth) await firebaseSignOut(firebaseAuth)
    },
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
