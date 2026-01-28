import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { renderWithRouter } from '@/test/render-with-router'
import type { ChatMessage } from '@/lib/api-client'
import { MessageList } from './message-list'

const baseMessage: ChatMessage = {
  id: 'msg_1',
  session_id: 'session_1',
  role: 'assistant',
  content: '',
  meta_json: null,
  created_at: '2026-01-28T00:00:00Z',
}

describe('MessageList inline sources', () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders structured sources with a heading and internal link', async () => {
    const message: ChatMessage = {
      ...baseMessage,
      content: 'Answer\n\n<sources><source title="T" url="https://x.test" item_id="item_1" /></sources>',
    }

    renderWithRouter(<MessageList messages={[message]} />)

    expect(await screen.findByText('Sources')).toBeInTheDocument()

    const link = await screen.findByRole('link', { name: 'T' })
    expect(link.getAttribute('href')).toContain('/items/item_1')
  })

  it('sanitizes unsafe javascript URLs to be non-clickable', async () => {
    const message: ChatMessage = {
      ...baseMessage,
      content: '<sources><source title="Bad" url="javascript:alert(1)" /></sources>',
    }

    renderWithRouter(<MessageList messages={[message]} />)

    expect(await screen.findByText('Bad')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Bad' })).toBeNull()
    
    const element = screen.getByText('Bad').closest('a')
    expect(element).toBeNull()
  })

  it('renders incomplete sources without crashing (streaming safety)', async () => {
    const message: ChatMessage = {
      ...baseMessage,
      content: '<sources><source title="Partial" url="https://x.test" item_id="item_1" />',
    }

    renderWithRouter(<MessageList messages={[message]} />)

    expect(await screen.findByText('Partial')).toBeInTheDocument()
  })
})
