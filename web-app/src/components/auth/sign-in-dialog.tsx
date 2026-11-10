import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, AtSign, CheckCircle2, LockKeyhole, X } from 'lucide-react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth'
import { auth } from '../../lib/firebase'
import { Button, IconButton } from '../ui/button'
import { Input } from '../ui/input'

type Mode = 'signin' | 'signup' | 'forgot'

function firebaseErrorMessage(code?: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/user-disabled':
      return 'This account has been disabled.'
    case 'auth/user-not-found':
      return 'No account found with this email.'
    case 'auth/wrong-password':
      return 'Incorrect password. Try again or reset it.'
    case 'auth/invalid-credential':
      return 'Invalid email or password.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Sign in instead.'
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 8 characters.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    case 'auth/configuration-not-found':
    case 'auth/operation-not-allowed':
      return 'Email and password sign-in is not enabled for this Firebase project yet.'
    default:
      return ''
  }
}

export function SignInDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function changeMode(next: Mode) {
    setMode(next)
    setMessage('')
    setError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    if (!auth) {
      setError('Add your Firebase configuration to enable accounts.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password)
        onOpenChange(false)
      } else if (mode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, email, password)
        await sendEmailVerification(credential.user).catch(() => undefined)
        setMessage('Check your inbox to verify your email and finish creating your account.')
      } else {
        await sendPasswordResetEmail(auth, email)
        setMessage('If an account matches that email, a reset link is on its way.')
      }
    } catch (cause) {
      const firebaseError = cause as { code?: string; message?: string }
      const friendlyMessage = firebaseErrorMessage(firebaseError.code)
      setError(friendlyMessage || firebaseError.message || 'Sign-in failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset your password'
  const submitLabel = mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm data-[state=open]:animate-in" />
        <Dialog.Content className="neumorphic fixed left-1/2 top-1/2 z-50 w-[min(92vw,430px)] -translate-x-1/2 -translate-y-1/2 rounded-[30px] border border-line/70 p-7 shadow-soft-lg focus:outline-none sm:p-9">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-2xl font-bold tracking-tight text-ink">{title}</Dialog.Title>
              <Dialog.Description className="mt-2 text-sm leading-6 text-muted">
                {mode === 'signin' ? 'Pick up where you left off.' : mode === 'signup' ? 'Save your place and build a library of your own.' : "We'll send a secure reset link to your email."}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild><IconButton aria-label="Close sign in dialog" variant="ghost" className="-mr-2 -mt-2"><X className="size-4" /></IconButton></Dialog.Close>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-2 text-xs font-semibold text-muted" htmlFor="auth-email">
              Email address
              <span className="relative block"><AtSign className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim" /><Input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required className="pl-10" placeholder="you@example.com" /></span>
            </label>
            {mode !== 'forgot' && <label className="block space-y-2 text-xs font-semibold text-muted" htmlFor="auth-password">
              Password
              <span className="relative block"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-dim" /><Input id="auth-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={8} required className="pl-10" placeholder="At least 8 characters" /></span>
            </label>}
            {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 px-3 py-2 text-sm text-red-300">{error}</p>}
            {message && <p role="status" className="flex gap-2 rounded-xl border border-mint/20 bg-mint/5 px-3 py-2.5 text-sm leading-5 text-mint"><CheckCircle2 className="mt-0.5 size-4 shrink-0" />{message}</p>}
            <Button type="submit" variant="primary" className="mt-2 w-full" disabled={busy}>{busy ? 'Please wait…' : submitLabel}<ArrowRight className="size-4" /></Button>
          </form>
          <div className="mt-5 flex flex-wrap justify-center gap-x-3 gap-y-2 text-xs text-muted">
            {mode === 'signin' ? <><button type="button" className="hover:text-ink" onClick={() => changeMode('signup')}>Create an account</button><span aria-hidden="true">·</span><button type="button" className="hover:text-ink" onClick={() => changeMode('forgot')}>Forgot password?</button></> : <button type="button" className="hover:text-ink" onClick={() => changeMode('signin')}>Back to sign in</button>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
