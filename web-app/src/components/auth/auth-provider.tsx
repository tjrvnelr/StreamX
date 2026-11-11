import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut, type User } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { AuthContext, type AuthContextValue } from './auth-context'
import { isFirebaseConfigured, auth as firebaseAuth, db } from '../../lib/firebase'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [emailVerified, setEmailVerified] = useState(false)
  const [loading, setLoading] = useState(isFirebaseConfigured)

  const reloadUser = useCallback(async () => {
    const currentUser = firebaseAuth?.currentUser
    if (!currentUser) return false

    await currentUser.reload()
    await currentUser.getIdToken(true)
    setUser(currentUser)
    setEmailVerified(currentUser.emailVerified)
    return currentUser.emailVerified
  }, [])

  useEffect(() => {
    if (!firebaseAuth) return
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      let currentUser = firebaseUser
      if (currentUser) {
        try {
          await currentUser.reload()
          await currentUser.getIdToken(true)
        } catch {
          // Keep the cached session available if the user cannot be refreshed offline.
        }
        currentUser = firebaseAuth.currentUser ?? currentUser
      }
      if (currentUser && db) {
        try {
          const profileRef = doc(db, 'profiles', currentUser.uid)
          const profileSnap = await getDoc(profileRef)
          if (!profileSnap.exists()) {
            const username = 'member_' + currentUser.uid.replace(/-/g, '').slice(0, 12)
            const displayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'StreamX creator'
            await setDoc(profileRef, {
              username,
              displayName,
              avatarUrl: currentUser.photoURL || null,
              bio: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
          }
        } catch {
          // If Firestore is offline or security rules block, proceed with user state
        }
      }
      setUser(currentUser)
      setEmailVerified(Boolean(currentUser?.emailVerified))
      setLoading(false)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!firebaseAuth) return
    let refreshing = false
    const refreshWhenVisible = () => {
      if (
        refreshing ||
        document.visibilityState !== 'visible' ||
        !firebaseAuth.currentUser
      ) return
      refreshing = true
      void reloadUser().catch(() => undefined).finally(() => { refreshing = false })
    }
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [reloadUser])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    emailVerified,
    loading,
    configured: isFirebaseConfigured,
    reloadUser,
    signOut: async () => {
      if (firebaseAuth) await firebaseSignOut(firebaseAuth)
    },
  }), [user, emailVerified, loading, reloadUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
