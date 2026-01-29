import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/items/tags/$tag')({
  component: TagItemsRedirect,
})

function TagItemsRedirect() {
  const { tag } = Route.useParams()

  return <Navigate to="/items" search={{ tag }} replace />
}
