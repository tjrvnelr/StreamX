import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'

export type AuthContextValue = {
  user: User | null
  emailVerified: boolean
  loading: boolean
  configured: boolean
  reloadUser: () => Promise<boolean>
  signOut: () => Promise<void>
}
export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
