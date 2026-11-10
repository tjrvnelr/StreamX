import { NavLink, useLocation } from 'react-router-dom'
import {
  Bookmark, ChevronLeft, Clapperboard, Compass, Flame, Heart, Home, Library, ListVideo,
  Menu, Settings2, Tags, UploadCloud, Video, X, Clock3,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { IconButton } from '../ui/button'

type SidebarProps = {
  mobileOpen: boolean
  onClose: () => void
  collapsed: boolean
  onToggle: () => void
}

const primaryLinks = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'Explore', to: '/explore', icon: Compass },
  { label: 'Trending', to: '/trending', icon: Flame },
  { label: 'Categories', to: '/categories', icon: Tags },
]

const libraryLinks = [
  { label: 'My library', to: '/library', icon: Library },
  { label: 'Watch history', to: '/library?tab=history', icon: Clock3 },
  { label: 'Watch later', to: '/library?tab=later', icon: Bookmark },
  { label: 'Playlists', to: '/library?tab=playlists', icon: ListVideo },
  { label: 'Liked videos', to: '/library?tab=liked', icon: Heart },
]

function NavItem({ label, to, icon: Icon, collapsed, onClick }: { label: string; to: string; icon: typeof Home; collapsed: boolean; onClick?: () => void }) {
  const location = useLocation()

  const [toPath, toSearch] = to.split('?')
  const toParams = new URLSearchParams(toSearch || '')
  const currentParams = new URLSearchParams(location.search)

  let isActive: boolean
  if (toSearch) {
    // Link has query params — match path AND all specified query params
    isActive = location.pathname === toPath &&
      Array.from(toParams.entries()).every(([key, value]) => currentParams.get(key) === value)
  } else if (to === '/') {
    // Home — exact match only
    isActive = location.pathname === '/'
  } else {
    // Regular path link — for '/library' only active when no tab param is set
    isActive = location.pathname === toPath &&
      (toPath === '/library' ? !currentParams.has('tab') : true)
  }

  return <NavLink
    to={to}
    onClick={onClick}
    title={collapsed ? label : undefined}
    className={() => cn(
      'group relative flex h-11 items-center gap-3 rounded-2xl px-3.5 text-sm font-medium transition-colors',
      collapsed && 'justify-center px-0',
      isActive ? 'bg-brand/10 text-brand shadow-inset-sm' : 'text-muted hover:bg-lifted/70 hover:text-ink',
    )}
  >
    <Icon aria-hidden="true" className={cn('size-[18px] shrink-0 transition-transform group-hover:scale-105', isActive && 'text-brand')} />
    {!collapsed && <span className="truncate">{label}</span>}
  </NavLink>
}

export function Sidebar({ mobileOpen, onClose, collapsed, onToggle }: SidebarProps) {
  const actualCollapsed = collapsed && !mobileOpen
  const closeOnNavigate = () => onClose()

  return <>
    {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={closeOnNavigate} />}
    <aside className={cn(
      'fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col border-r border-line/60 bg-canvas/95 px-4 pb-4 pt-5 backdrop-blur-xl transition-[transform,width] duration-200 lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0 lg:bg-canvas',
      collapsed ? 'lg:w-[92px]' : 'lg:w-[248px]',
      mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
    )}>
      <div className={cn('mb-8 flex h-11 items-center', actualCollapsed ? 'justify-center' : 'justify-between px-1')}>
        <NavLink to="/" onClick={closeOnNavigate} className="flex items-center gap-3 rounded-xl" aria-label="StreamX home">
          <span className="flex size-9 items-center justify-center rounded-[14px] bg-gradient-to-br from-brand-dark to-brand text-white shadow-accent"><Clapperboard className="size-[18px]" strokeWidth={2.4} /></span>
          {!actualCollapsed && <span className="text-[19px] font-extrabold tracking-[-0.06em] text-ink">stream<span className="text-brand">x</span></span>}
        </NavLink>
        <IconButton aria-label="Close navigation" variant="ghost" className="size-9 lg:hidden" onClick={closeOnNavigate}><X className="size-4" /></IconButton>
        {!actualCollapsed && <IconButton aria-label="Collapse sidebar" variant="ghost" className="hidden size-8 lg:inline-flex" onClick={onToggle}><ChevronLeft className="size-4" /></IconButton>}
        {actualCollapsed && <IconButton aria-label="Expand sidebar" variant="ghost" className="hidden size-8 lg:inline-flex" onClick={onToggle}><Menu className="size-4" /></IconButton>}
      </div>

      <nav aria-label="Main navigation" className="scrollbar-hidden flex-1 space-y-1 overflow-y-auto">
        {primaryLinks.map((item) => <NavItem key={item.to} {...item} collapsed={actualCollapsed} onClick={closeOnNavigate} />)}
        <div className={cn('my-5 h-px bg-line/70', actualCollapsed && 'mx-2')} />
        {!actualCollapsed && <p className="mb-2 px-3.5 text-[10px] font-bold uppercase tracking-[0.16em] text-dim">Your space</p>}
        {libraryLinks.map((item) => <NavItem key={item.to} {...item} collapsed={actualCollapsed} onClick={closeOnNavigate} />)}
        <div className={cn('my-5 h-px bg-line/70', actualCollapsed && 'mx-2')} />
        <NavItem label="My uploads" to="/dashboard" icon={Video} collapsed={actualCollapsed} onClick={closeOnNavigate} />
        <NavItem label="Upload video" to="/upload" icon={UploadCloud} collapsed={actualCollapsed} onClick={closeOnNavigate} />
      </nav>

      <div className="mt-4 border-t border-line/70 pt-3">
        <NavItem label="Settings" to="/settings" icon={Settings2} collapsed={actualCollapsed} onClick={closeOnNavigate} />
      </div>
    </aside>
  </>
}
