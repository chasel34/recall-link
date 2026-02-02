import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/settings/')({
  component: SettingsIndexRedirect,
})

function SettingsIndexRedirect() {
  return <Navigate to="/settings/ai" replace />
}
