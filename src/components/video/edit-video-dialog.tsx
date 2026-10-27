import { useEffect, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Save, X } from 'lucide-react'
import type { Category, Video } from '../../types/video'
import { fetchCategories, saveUploadMetadata } from '../../services/videos'
import { Button, IconButton } from '../ui/button'
import { Input, Textarea } from '../ui/input'
import { useToast } from '../ui/toast-context'

export function EditVideoDialog({ video, open, onOpenChange, onSaved }: { video: Video; open: boolean; onOpenChange: (open: boolean) => void; onSaved: (changes: { title: string; description: string; categoryId: string | null }) => void }) {
  const [title, setTitle] = useState(video.title)
  const [description, setDescription] = useState(video.description)
  const [categoryId, setCategoryId] = useState(video.category?.id || '')
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!open) return
    void fetchCategories().then((result) => setCategories(result.categories.filter((category) => category.id))).catch(() => undefined)
  }, [open])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    const changes = { title: title.trim(), description, categoryId: categoryId || null }
    try {
      await saveUploadMetadata(video.id, changes)
      onSaved(changes)
      onOpenChange(false)
      toast('Video details saved.', 'success')
    } catch (cause) { toast(cause instanceof Error ? cause.message : 'Video details could not be saved.', 'error') }
    finally { setSaving(false) }
  }

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm" /><Dialog.Content className="neumorphic fixed left-1/2 top-1/2 z-50 w-[min(92vw,540px)] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-line/70 p-6 shadow-soft-lg focus:outline-none sm:p-7">
      <div className="flex items-start justify-between"><div><Dialog.Title className="text-lg font-bold text-ink">Edit video details</Dialog.Title><Dialog.Description className="mt-1.5 text-xs leading-5 text-muted">Update the title and description shown to viewers.</Dialog.Description></div><Dialog.Close asChild><IconButton aria-label="Close edit video dialog" variant="ghost" className="-mr-2 -mt-2 size-8"><X className="size-4" /></IconButton></Dialog.Close></div>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block space-y-2 text-xs font-semibold text-muted" htmlFor={`edit-title-${video.id}`}>Title<Input id={`edit-title-${video.id}`} required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="block space-y-2 text-xs font-semibold text-muted" htmlFor={`edit-description-${video.id}`}>Description<Textarea id={`edit-description-${video.id}`} maxLength={10000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <label className="block space-y-2 text-xs font-semibold text-muted" htmlFor={`edit-category-${video.id}`}>Category<select id={`edit-category-${video.id}`} value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="h-11 w-full rounded-2xl border border-line/70 bg-surface px-3.5 text-sm text-ink shadow-inset-sm outline-none focus:border-violet/60"><option value="">No category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <div className="flex justify-end gap-2 pt-1"><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}<Save className="size-4" /></Button></div>
      </form>
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>
}
