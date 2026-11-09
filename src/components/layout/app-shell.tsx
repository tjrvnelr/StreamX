import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, LogOut, Menu, Moon, Plus, Sun, UploadCloud, UserRound, Video } from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { SignInDialog } from '../auth/sign-in-dialog'
import { SearchBox } from '../search/search-box'
import { Button, IconButton } from '../ui/button'
import { useTheme } from '../ui/theme-context'
import { Sidebar } from './sidebar'

function userInitials(name: string) {
  return name.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'SX'
}

export function AppShell() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const displayName = String(user?.displayName || user?.email || 'Your account')

  return <div className="min-h-screen bg-canvas text-ink lg:flex">
    <a href="#main-content" className="sr-only fixed left-4 top-4 z-[90] rounded-xl bg-brand px-4 py-2 text-sm font-bold text-brand-foreground focus:not-sr-only">Skip to content</a>
    <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((value) => !value)} />
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-30 border-b border-line/50 bg-canvas/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-[1680px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <IconButton aria-label="Open navigation" variant="ghost" className="size-10 shrink-0 lg:hidden" onClick={() => setMobileNavOpen(true)}><Menu className="size-5" /></IconButton>
          <Link to="/" className="flex shrink-0 items-center gap-2 lg:hidden" aria-label="StreamX home"><span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-dark to-brand text-white"><Video className="size-4" /></span><span className="text-base font-extrabold tracking-[-0.06em]">stream<span className="text-brand">x</span></span></Link>
          <div className="hidden min-w-0 flex-1 lg:flex lg:justify-center"><SearchBox /></div>
          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <Link to="/upload" className="hidden sm:block"><Button variant="primary" size="sm" className="h-10 rounded-2xl px-4"><Plus className="size-4" /><span>Upload</span></Button></Link>
            <Link to="/upload" className="sm:hidden"><IconButton aria-label="Upload video" variant="primary" className="size-9"><UploadCloud className="size-4" /></IconButton></Link>
            <IconButton aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} variant="ghost" className="size-10" onClick={toggleTheme}>{theme === 'dark' ? <Sun className="size-[17px]" /> : <Moon className="size-[17px]" />}</IconButton>
            {user ? <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild><button className="flex h-10 items-center gap-2 rounded-full border border-line/80 bg-raised px-1.5 pr-3 text-left shadow-soft-sm transition hover:bg-lifted" aria-label="Open account menu"><span className="flex size-7 items-center justify-center rounded-full bg-brand-dark text-[10px] font-extrabold text-white">{userInitials(displayName)}</span><span className="hidden max-w-28 truncate text-xs font-semibold sm:block">{displayName.split('@')[0]}</span><ChevronDown className="hidden size-3.5 text-dim sm:block" /></button></DropdownMenu.Trigger>
              <DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={10} className="neumorphic z-50 min-w-52 rounded-2xl border border-line/70 p-2 shadow-soft-lg">
                <div className="border-b border-line/70 px-3 py-2.5"><p className="text-xs font-semibold text-ink">{displayName}</p><p className="mt-1 truncate text-[11px] text-dim">{user.email}</p></div>
                <DropdownMenu.Item asChild><Link to="/settings" className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-muted outline-none hover:bg-lifted hover:text-ink"><UserRound className="size-4" />Account settings</Link></DropdownMenu.Item>
                <DropdownMenu.Item onSelect={() => void signOut()} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-muted outline-none hover:bg-lifted hover:text-ink"><LogOut className="size-4" />Sign out</DropdownMenu.Item>
              </DropdownMenu.Content></DropdownMenu.Portal>
            </DropdownMenu.Root> : <Button size="sm" variant="raised" className="h-10 rounded-full px-4" onClick={() => setAuthOpen(true)}>Sign in</Button>}
          </div>
        </div>
        <div className="px-4 pb-3 sm:px-6 lg:hidden"><SearchBox compact /></div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-[1680px] px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-9"><Outlet key={`${location.pathname}${location.search}`} context={{ openAuth: () => setAuthOpen(true) }} /></main>
    </div>
    <SignInDialog open={authOpen} onOpenChange={setAuthOpen} />
  </div>
}
