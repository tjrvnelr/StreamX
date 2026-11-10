import { useEffect, useState, type FormEvent } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { Check, LogOut, Moon, Save, Sun, UserRound } from 'lucide-react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { useAuth } from '../components/auth/auth-context'
import { EmptyState } from '../components/ui/content-state'
import { Button } from '../components/ui/button'
import { Input, Textarea } from '../components/ui/input'
import { useTheme } from '../components/ui/theme-context'
import { useToast } from '../components/ui/toast-context'
import { isFirebaseConfigured, auth as firebaseAuth, db } from '../lib/firebase'

type ShellContext = { openAuth: () => void }
type ProfileForm = { username: string; display_name: string; bio: string; avatar_url: string }

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const { openAuth } = useOutletContext<ShellContext>()
  const { theme, toggleTheme } = useTheme()
  const { toast } = useToast()
  const [profile, setProfile] = useState<ProfileForm>({ username: '', display_name: '', bio: '', avatar_url: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  useEffect(() => {
    let active = true
    if (!db || !user) return
    void getDoc(doc(db, 'profiles', user.uid)).then((snap) => {
      if (active && snap.exists()) {
        const data = snap.data()
        setProfile({
          username: data.username || '',
          display_name: data.displayName || '',
          bio: data.bio || '',
          avatar_url: data.avatarUrl || '',
        })
      }
      if (active) setLoading(false)
    }).catch(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [user])

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!db || !user) return
    const username = profile.username.trim().toLowerCase()
    if (!/^[a-z0-9_]{3,32}$/.test(username)) {
      toast('Username must be 3–32 characters using letters, numbers, and underscores.', 'error')
      return
    }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'profiles', user.uid), {
        username,
        displayName: profile.display_name.trim(),
        bio: profile.bio,
        avatarUrl: profile.avatar_url,
        updatedAt: new Date().toISOString(),
      })
      setProfile((current) => ({ ...current, username }))
      toast('Profile saved.', 'success')
    } catch {
      toast('Profile could not be saved. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function sendPasswordReset() {
    if (!firebaseAuth || !user?.email) return
    try {
      await sendPasswordResetEmail(firebaseAuth, user.email)
      setResetSent(true)
      toast('Password reset link sent.', 'success')
    } catch {
      toast('Password reset email could not be sent. Try again later.', 'error')
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          title={isFirebaseConfigured ? 'Sign in to open settings' : 'Account settings'}
          description={isFirebaseConfigured ? 'Your profile and sign-in options are available after you sign in.' : 'Connect Firebase to manage a profile and account.'}
          action={isFirebaseConfigured ? 'Sign in' : undefined}
          onAction={isFirebaseConfigured ? openAuth : undefined}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl animate-fade-up space-y-7">
      <header>
        <p className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.17em] text-brand">
          <UserRound className="size-3.5" />Account
        </p>
        <h1 className="text-3xl font-extrabold tracking-[-0.06em] text-ink sm:text-[38px]">Settings</h1>
        <p className="mt-2 text-sm text-muted">Manage how you show up on StreamX.</p>
      </header>

      <section aria-labelledby="profile-heading" className="neumorphic rounded-[26px] border border-line/50 p-5 shadow-soft sm:p-7">
        <div className="mb-5">
          <h2 id="profile-heading" className="text-base font-bold text-ink">Public profile</h2>
          <p className="mt-1 text-xs text-muted">This information is visible alongside your published videos.</p>
        </div>
        {loading ? (
          <div role="status" className="h-40 animate-pulse rounded-2xl bg-raised" />
        ) : (
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2 text-xs font-semibold text-muted" htmlFor="profile-display-name">
                Display name
                <Input
                  id="profile-display-name"
                  required
                  maxLength={80}
                  value={profile.display_name}
                  onChange={(event) => setProfile((current) => ({ ...current, display_name: event.target.value }))}
                  placeholder="Your name"
                />
              </label>
              <label className="block space-y-2 text-xs font-semibold text-muted" htmlFor="profile-username">
                Username
                <Input
                  id="profile-username"
                  required
                  minLength={3}
                  maxLength={32}
                  value={profile.username}
                  onChange={(event) => setProfile((current) => ({ ...current, username: event.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() }))}
                  placeholder="your_handle"
                />
              </label>
            </div>
            <label className="block space-y-2 text-xs font-semibold text-muted" htmlFor="profile-bio">
              Bio
              <Textarea
                id="profile-bio"
                maxLength={500}
                value={profile.bio}
                onChange={(event) => setProfile((current) => ({ ...current, bio: event.target.value }))}
                placeholder="A little about you…"
                className="min-h-24"
              />
            </label>
            <label className="block space-y-2 text-xs font-semibold text-muted" htmlFor="profile-avatar">
              Avatar image URL <span className="font-normal text-dim">(optional)</span>
              <Input
                id="profile-avatar"
                type="url"
                maxLength={500}
                value={profile.avatar_url}
                onChange={(event) => setProfile((current) => ({ ...current, avatar_url: event.target.value }))}
                placeholder="https://…"
              />
            </label>
            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save profile'}
                <Save className="size-4" />
              </Button>
            </div>
          </form>
        )}
      </section>

      <section aria-labelledby="account-heading" className="neumorphic rounded-[26px] border border-line/50 p-5 shadow-soft sm:p-7">
        <h2 id="account-heading" className="text-base font-bold text-ink">Sign-in and preferences</h2>
        <div className="mt-4 divide-y divide-line/60">
          <div className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0">
            <div>
              <p className="text-xs font-semibold text-ink">Email address</p>
              <p className="mt-1 text-xs text-muted">{user.email}{user.emailVerified ? ' · verified' : ' · verification required'}</p>
            </div>
            <Button variant="outline" size="sm" disabled={resetSent} onClick={() => void sendPasswordReset()}>
              {resetSent ? <><Check className="size-3.5" />Email sent</> : 'Reset password'}
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="text-xs font-semibold text-ink">Appearance</p>
              <p className="mt-1 text-xs text-muted">Choose the theme that feels comfortable.</p>
            </div>
            <Button variant="raised" size="sm" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div>
              <p className="text-xs font-semibold text-ink">Sign out</p>
              <p className="mt-1 text-xs text-muted">End this session on this device.</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void signOut()}>
              <LogOut className="size-4" />Sign out
            </Button>
          </div>
        </div>
      </section>
      <div className="text-center text-[10px] text-dim">
        <Link to="/library" className="hover:text-brand">Back to your library</Link>
      </div>
    </div>
  )
}
