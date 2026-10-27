import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { Bookmark, Clock3, Heart, ListVideo, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../components/auth/auth-context'
import { VideoCard } from '../components/video/video-card'
import { EmptyState, ErrorState, VideoGridSkeleton } from '../components/ui/content-state'
import { Button, IconButton } from '../components/ui/button'
import { Input, Textarea } from '../components/ui/input'
import { useToast } from '../components/ui/toast-context'
import { isSupabaseConfigured } from '../lib/supabase'
import { createPlaylist, deletePlaylist, fetchLibraryVideos, fetchPlaylistVideos, fetchPlaylists, removeFromLibrary, removeFromPlaylist, type LibraryTab, type LibraryVideoItem, type Playlist } from '../services/videos'
import type { Video } from '../types/video'

type ShellContext = { openAuth: () => void }

const tabs: Array<{ id: LibraryTab | 'playlists'; name: string; icon: typeof Clock3 }> = [
  { id: 'history', name: 'History', icon: Clock3 },
  { id: 'later', name: 'Watch later', icon: Bookmark },
  { id: 'liked', name: 'Liked videos', icon: Heart },
  { id: 'playlists', name: 'Playlists', icon: ListVideo },
]

export function LibraryPage() {
  const { user } = useAuth()
  const { openAuth } = useOutletContext<ShellContext>()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const activeTab = params.get('tab') || 'history'
  const selectedPlaylistId = params.get('id') || ''
  const [items, setItems] = useState<LibraryVideoItem[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [playlistVideos, setPlaylistVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [playlistName, setPlaylistName] = useState('')
  const [playlistDescription, setPlaylistDescription] = useState('')

  const load = useCallback(async () => {
    if (!user || !isSupabaseConfigured) { setLoading(false); return }
    setLoading(true)
    setError('')
    try {
      if (activeTab === 'playlists') {
        const result = await fetchPlaylists()
        setPlaylists(result)
        if (selectedPlaylistId) setPlaylistVideos(await fetchPlaylistVideos(selectedPlaylistId))
        else setPlaylistVideos([])
        setItems([])
      } else {
        const result = await fetchLibraryVideos(activeTab as LibraryTab)
        setItems(result)
        setPlaylists([])
        setPlaylistVideos([])
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Your library could not be loaded.') }
    finally { setLoading(false) }
  }, [user, activeTab, selectedPlaylistId])

  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => { if (active) void load() })
    return () => { active = false }
  }, [load])

  function selectTab(tab: string) {
    setParams(tab === 'history' ? {} : { tab })
    setShowCreate(false)
  }

  async function removeItem(videoId: string) {
    try {
      await removeFromLibrary(videoId, activeTab as LibraryTab)
      setItems((current) => current.filter((item) => item.video.id !== videoId))
      toast('Removed from your library.', 'success')
    } catch (cause) { toast(cause instanceof Error ? cause.message : 'This item could not be removed.', 'error') }
  }

  async function removePlaylistItem(videoId: string) {
    try {
      await removeFromPlaylist(selectedPlaylistId, videoId)
      setPlaylistVideos((current) => current.filter((video) => video.id !== videoId))
      toast('Removed from this playlist.', 'success')
    } catch (cause) { toast(cause instanceof Error ? cause.message : 'This item could not be removed.', 'error') }
  }

  async function makePlaylist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      const playlist = await createPlaylist(playlistName, playlistDescription)
      setPlaylists((current) => [playlist, ...current])
      setPlaylistName('')
      setPlaylistDescription('')
      setShowCreate(false)
      toast('Playlist created.', 'success')
    } catch (cause) { toast(cause instanceof Error ? cause.message : 'Playlist could not be created.', 'error') }
  }

  async function removePlaylist(playlistId: string) {
    if (!window.confirm('Delete this playlist? Videos in it will remain in your library.')) return
    try {
      await deletePlaylist(playlistId)
      setPlaylists((current) => current.filter((item) => item.id !== playlistId))
      if (selectedPlaylistId === playlistId) setParams({ tab: 'playlists' })
      toast('Playlist deleted.', 'success')
    } catch (cause) { toast(cause instanceof Error ? cause.message : 'Playlist could not be deleted.', 'error') }
  }

  if (!user) return <div className="mx-auto max-w-2xl"><EmptyState title={isSupabaseConfigured ? 'Sign in to open your library' : 'Your library starts here'} description={isSupabaseConfigured ? 'Your history, saved videos, and playlists stay private to your account.' : 'Connect Supabase and sign in to keep your history, likes, and playlists in sync.'} action={isSupabaseConfigured ? 'Sign in' : undefined} onAction={isSupabaseConfigured ? openAuth : undefined} /></div>

  const selectedPlaylist = playlists.find((item) => item.id === selectedPlaylistId)
  const isPlaylistView = activeTab === 'playlists'
  const title = isPlaylistView ? selectedPlaylist?.name || 'Your playlists' : tabs.find((tab) => tab.id === activeTab)?.name || 'My library'
  const displayedItems: LibraryVideoItem[] = isPlaylistView ? playlistVideos.map((video) => ({ video })) : items
  const activeTabIcon = tabs.find((tab) => tab.id === activeTab)?.icon || Clock3
  const ActiveIcon = activeTabIcon

  return <div className="animate-fade-up space-y-7">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.17em] text-violet"><ActiveIcon className="size-3.5" />Your space</p><h1 className="text-3xl font-extrabold tracking-[-0.06em] text-ink sm:text-[38px]">{title}</h1><p className="mt-2 text-sm text-muted">A personal place for everything you want to revisit.</p></div>{isPlaylistView && selectedPlaylistId && <Button variant="outline" size="sm" onClick={() => setParams({ tab: 'playlists' })}><ListVideo className="size-4" />All playlists</Button>}</header>

    <div role="tablist" aria-label="Library sections" className="scrollbar-hidden flex gap-2 overflow-x-auto border-b border-line/60 pb-3">{tabs.map((tab) => <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} type="button" onClick={() => selectTab(tab.id)} className={`flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold transition ${activeTab === tab.id ? 'bg-violet/10 text-violet shadow-inset-sm' : 'text-muted hover:bg-lifted/70 hover:text-ink'}`}><tab.icon className="size-4" />{tab.name}</button>)}</div>

    {error ? <ErrorState message={error} onRetry={() => void load()} /> : loading ? <VideoGridSkeleton count={8} /> : activeTab === 'playlists' ? <>
      <div className="flex justify-end"><Button variant="primary" size="sm" onClick={() => setShowCreate((value) => !value)}><Plus className="size-4" />New playlist</Button></div>
      {showCreate && <form onSubmit={makePlaylist} className="neumorphic grid gap-3 rounded-[24px] border border-line/60 p-4 shadow-soft sm:grid-cols-[1fr_1.4fr_auto] sm:items-end"><label className="space-y-2 text-[11px] font-semibold text-muted" htmlFor="new-playlist-name">Name<Input id="new-playlist-name" required maxLength={100} value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} placeholder="Weekend watches" /></label><label className="space-y-2 text-[11px] font-semibold text-muted" htmlFor="new-playlist-description">Description<Textarea id="new-playlist-description" maxLength={2000} className="min-h-11 py-2.5" value={playlistDescription} onChange={(event) => setPlaylistDescription(event.target.value)} placeholder="Optional" /></label><Button type="submit" variant="primary" className="h-11">Create <Plus className="size-4" /></Button></form>}
      {selectedPlaylistId && <div className="flex items-center justify-between rounded-2xl bg-raised/70 px-4 py-3"><div><p className="text-xs font-bold text-ink">{selectedPlaylist?.name || 'Playlist'}</p><p className="mt-1 text-[10px] text-muted">{selectedPlaylist?.description || 'Private playlist'}</p></div><IconButton aria-label="Delete playlist" variant="ghost" className="text-red-300 hover:bg-red-400/10" onClick={() => void removePlaylist(selectedPlaylistId)}><Trash2 className="size-4" /></IconButton></div>}
      {!selectedPlaylistId && playlists.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{playlists.map((playlist) => <div key={playlist.id} className="neumorphic flex items-center gap-3 rounded-2xl border border-line/60 p-4 shadow-soft-sm"><button type="button" onClick={() => setParams({ tab: 'playlists', id: playlist.id })} className="flex min-w-0 flex-1 items-center gap-3 text-left"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lifted text-violet"><ListVideo className="size-5" /></span><span className="min-w-0"><span className="block truncate text-sm font-bold text-ink">{playlist.name}</span><span className="mt-1 block truncate text-[10px] text-muted">{playlist.description || 'Private playlist'}</span></span></button><IconButton aria-label={`Delete ${playlist.name}`} variant="ghost" className="size-8 text-dim hover:text-red-300" onClick={() => void removePlaylist(playlist.id)}><Trash2 className="size-3.5" /></IconButton></div>)}</div> : null}
      {selectedPlaylistId && displayedItems.length ? <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{displayedItems.map(({ video }) => <div key={video.id}><VideoCard video={video} /><button type="button" onClick={() => void removePlaylistItem(video.id)} className="mt-2 text-[10px] font-semibold text-dim hover:text-red-300">Remove from playlist</button></div>)}</div> : null}
      {!playlists.length && !showCreate && <EmptyState title="No playlists yet" description="Make a playlist for the videos you want to watch together." action="Create a playlist" onAction={() => setShowCreate(true)} />}
      {selectedPlaylistId && !displayedItems.length && <EmptyState title="This playlist is empty" description="Open a video and add it to this playlist when you find something you like." action="Explore videos" onAction={() => navigate('/explore')} />}
    </> : displayedItems.length ? <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{displayedItems.map(({ video, progressSeconds }) => <div key={video.id}><VideoCard video={video} progressPercent={progressSeconds ? Math.round(progressSeconds / Math.max(video.durationSeconds, 1) * 100) : undefined} /><button type="button" onClick={() => void removeItem(video.id)} className="mt-2 text-[10px] font-semibold text-dim hover:text-red-300">Remove from {activeTab === 'history' ? 'history' : activeTab === 'later' ? 'Watch later' : 'liked videos'}</button></div>)}</div> : <EmptyState title={activeTab === 'history' ? 'Nothing watched yet' : activeTab === 'later' ? 'Your Watch later list is clear' : 'No liked videos yet'} description={activeTab === 'history' ? 'Videos you watch will be saved here so you can pick up where you left off.' : activeTab === 'later' ? 'Save a video to come back to it when you have time.' : 'Tap Like on a video to keep it in this collection.'} action="Explore videos" onAction={() => navigate('/explore')} />}
  </div>
}
