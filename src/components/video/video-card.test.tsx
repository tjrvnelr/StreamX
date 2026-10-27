import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { previewVideos } from '../../data/preview-videos'
import { ToastProvider } from '../ui/toast-provider'
import { VideoCard } from './video-card'

describe('VideoCard', () => {
  it('shows the title, creator, and labelled preview data', () => {
    render(<MemoryRouter><ToastProvider><VideoCard video={previewVideos[0]} /></ToastProvider></MemoryRouter>)
    expect(screen.getByRole('link', { name: /watch the quiet coast of lofoten/i })).toBeInTheDocument()
    expect(screen.getByText('Mira Sol')).toBeInTheDocument()
    expect(screen.getByText('Preview')).toBeInTheDocument()
  })
})
