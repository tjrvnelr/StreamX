import { useEffect, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Check, ListVideo, Plus, X } from 'lucide-react'
import { addToPlaylist, createPlaylist, fetchPlaylists, type Playlist } from '../../services/videos'
import { Button, IconButton } from '../ui/button'
import { Input, Textarea } from '../ui/input'
import { useToast } from '../ui/toast-context'

export function AddToPlaylistDialog({ open, onOpenChange, videoId }: { open: boolean; onOpenChange: (open: boolean) => void; videoId: string }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!open) return
    void fetchPlaylists().then(setPlaylists).catch((cause: unknown) => toast(cause instanceof Error ? cause.message : 'Playlists could not be loaded.', 'error')).finally(() => setLoading(false))
  }, [open, toast])

  async function add(playlist: Playlist) {
    setBusyId(playlist.id)
    try {
      await addToPlaylist(playlist.id, videoId)
      toast(`Added to ${playlist.name}.`, 'success')
      onOpenChange(false)
    } catch (cause) { toast(cause instanceof Error ? cause.message : 'Could not add video.', 'error') }
    finally { setBusyId('') }
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreating(true)
    try {
      const playlist = await createPlaylist(name, description)
      await addToPlaylist(playlist.id, videoId)
      toast(`Created ${playlist.name} and added this video.`, 'success')
      onOpenChange(false)
    } catch (cause) { toast(cause instanceof Error ? cause.message : 'Playlist could not be created.', 'error') }
    finally { setCreating(false) }
  }

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm" />
      <Dialog.Content className="neumorphic fixed left-1/2 top-1/2 z-50 w-[min(92vw,450px)] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-line/70 p-6 shadow-soft-lg focus:outline-none sm:p-7">
        <div className="flex items-start justify-between"><div><Dialog.Title className="text-lg font-bold text-ink">Save to a playlist</Dialog.Title><Dialog.Description className="mt-1.5 text-xs leading-5 text-muted">Keep this video with a collection you can return to.</Dialog.Description></div><Dialog.Close asChild><IconButton aria-label="Close playlist dialog" variant="ghost" className="-mr-2 -mt-2 size-8"><X className="size-4" /></IconButton></Dialog.Close></div>
        {showCreate ? <form onSubmit={submitCreate} className="mt-5 space-y-3"><label className="block space-y-2 text-xs font-semibold text-muted" htmlFor="playlist-name">Playlist name<Input id="playlist-name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Weekend watches" /></label><label className="block space-y-2 text-xs font-semibold text-muted" htmlFor="playlist-description">Description <span className="font-normal text-dim">(optional)</span><Textarea id="playlist-description" maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What belongs in this list?" className="min-h-20" /></label><div className="flex justify-end gap-2 pt-1"><Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Back</Button><Button type="submit" variant="primary" size="sm" disabled={creating}>{creating ? 'Creating…' : 'Create playlist'}<Plus className="size-3.5" /></Button></div></form> : <>
          <div className="mt-5 max-h-64 space-y-2 overflow-y-auto">{loading ? <p role="status" className="py-5 text-center text-xs text-muted">Loading your playlists…</p> : playlists.length ? playlists.map((playlist) => <button key={playlist.id} type="button" disabled={Boolean(busyId)} onClick={() => void add(playlist)} className="flex w-full items-center gap-3 rounded-2xl border border-line/60 bg-surface/70 px-3.5 py-3 text-left transition hover:bg-lifted disabled:opacity-50"><span className="flex size-9 items-center justify-center rounded-xl bg-lifted text-violet"><ListVideo className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-ink">{playlist.name}</span><span className="mt-1 block truncate text-[10px] text-muted">{playlist.visibility === 'private' ? 'Private playlist' : 'Public playlist'}</span></span>{busyId === playlist.id ? <span className="text-[10px] text-muted">Adding…</span> : <Check className="size-4 text-dim" />}</button>) : <p className="rounded-xl bg-surface/70 px-4 py-5 text-center text-xs leading-5 text-muted">No playlists yet. Create one and add this video.</p>}</div>
          <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => setShowCreate(true)}><Plus className="size-4" />Create a playlist</Button>
        </>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
