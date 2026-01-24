import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ChatContainer } from '../../components/chat/chat-container'

export const Route = createFileRoute('/chat/$id')({
  component: ChatSession,
  validateSearch: z.object({
    q: z.string().optional(),
  }),
})

function ChatSession() {
  const { id } = Route.useParams()
  const search = Route.useSearch()
  
  return <ChatContainer sessionId={id} initialMessage={search.q} />
}
