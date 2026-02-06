import { beforeAll, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { z } from 'zod'

import { ChatContainer } from './chat-container'

const { sendChatMessageStreamMock } = vi.hoisted(() => {
  return { sendChatMessageStreamMock: vi.fn() }
})

const { mockHistoryData, mockSessionsData } = vi.hoisted(() => {
  return {
    mockHistoryData: { messages: [] as any[] },
    mockSessionsData: { sessions: [] as any[] },
  }
})

vi.mock('../../lib/api-client', () => {
  return {
    apiClient: {
      createChatSession: vi.fn(),
      sendChatMessageStream: sendChatMessageStreamMock,
    },
  }
})

vi.mock('../../hooks/use-chat-messages', () => {
  return {
    useChatMessages: () => ({ data: mockHistoryData, isLoading: false }),
  }
})

vi.mock('../../hooks/use-chat-sessions', () => {
  return {
    useChatSessions: () => ({ data: mockSessionsData }),
  }
})


function renderChatAt(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  const rootRoute = createRootRoute({
    component: () => <Outlet />,
  })

  const chatRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/chat/$id',
    validateSearch: z.object({
      q: z.string().optional(),
    }),
    component: () => {
      const { id } = chatRoute.useParams()
      const search = chatRoute.useSearch()
      return (
        <>
          <div data-testid="q">{search.q ?? ''}</div>
          <ChatContainer sessionId={id} initialMessage={search.q} />
        </>
      )
    },
  })

  const routeTree = rootRoute.addChildren([chatRoute])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  })

  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )

  return { ...view, router }
}

describe('ChatContainer initial message handoff', () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  it('consumes ?q= handoff param so refresh will not re-send', async () => {
    sendChatMessageStreamMock.mockImplementation((_sessionId: string, _message: string, opts: any) => {
      // End the stream immediately so the component can settle.
      opts.onDone?.({ assistant_message_id: 'msg_assistant' })
      return { close: vi.fn() }
    })

    const first = renderChatAt('/chat/session_1?q=hello')

    await waitFor(() => {
      expect(screen.getByTestId('q').textContent).toBe('')
    })
    expect(sendChatMessageStreamMock).toHaveBeenCalledTimes(1)
    expect(sendChatMessageStreamMock).toHaveBeenCalledWith(
      'session_1',
      'hello',
      expect.objectContaining({
        onMeta: expect.any(Function),
        onDelta: expect.any(Function),
      })
    )

    const refreshedPath = `${first.router.history.location.pathname}${first.router.history.location.search}`
    first.unmount()

    renderChatAt(refreshedPath)
    await waitFor(() => {
      expect(screen.getByTestId('q').textContent).toBe('')
    })
    expect(sendChatMessageStreamMock).toHaveBeenCalledTimes(1)
  })
})
