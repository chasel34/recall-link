import { createFileRoute } from '@tanstack/react-router'
import { ChatContainer } from '../../components/chat/chat-container'

export const Route = createFileRoute('/chat/')({
  component: ChatIndex,
})

function ChatIndex() {
  return <ChatContainer />
}
