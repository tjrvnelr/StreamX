import { useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, AtSign, CheckCircle2, LockKeyhole, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Button, IconButton } from '../ui/button'
import { Input } from '../ui/input'

type Mode = 'signin' | 'signup' | 'forgot'

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
    if (!supabase) {
      setError('Add your Supabase URL and anon key to enable accounts.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError
        onOpenChange(false)
      } else if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
        if (authError) throw authError
        if (data.session) onOpenChange(false)
        else setMessage('Check your inbox to verify your email and finish creating your account.')
      } else {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/settings` })
        if (authError) throw authError
        setMessage('If an account matches that email, a reset link is on its way.')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed. Please try again.')
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
                {mode === 'signin' ? 'Pick up where you left off.' : mode === 'signup' ? 'Save your place and build a library of your own.' : 'We’ll send a secure reset link to your email.'}
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
