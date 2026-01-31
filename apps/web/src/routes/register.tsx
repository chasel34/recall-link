import React from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Card, CardBody, CardHeader, Button, Input } from '@/components/base'
import { apiClient, ApiError } from '@/lib/api-client'
import { queryClient } from '@/lib/query-client'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await apiClient.register(email, password)
      queryClient.clear()
      await navigate({ to: '/items', replace: true })
    } catch (err) {
      const message = err instanceof ApiError ? err.data.message || err.message : err instanceof Error ? err.message : String(err)
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="font-serif text-3xl font-semibold text-foreground/90">Recall Link</div>
          <div className="mt-2 text-sm text-muted-foreground">创建账号，开始保存你的链接</div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="pb-4">
            <div className="font-serif text-xl font-semibold">注册</div>
            <div className="text-sm text-muted-foreground">邮箱 + 密码（至少 8 位）</div>
          </CardHeader>
          <CardBody>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1">
                <label htmlFor="register-email" className="text-xs font-medium text-muted-foreground">
                  邮箱
                </label>
                <Input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onValueChange={setEmail}
                  isInvalid={!!error}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="register-password" className="text-xs font-medium text-muted-foreground">
                  密码
                </label>
                <Input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="至少 8 位"
                  value={password}
                  onValueChange={setPassword}
                  isInvalid={!!error}
                  errorMessage={error}
                />
              </div>

              <Button type="submit" className="w-full" isLoading={isLoading} color="primary">
                创建账号
              </Button>

              <div className="text-xs text-muted-foreground text-center">
                已有账号？{' '}
                <Link to="/login" className="text-foreground underline decoration-border hover:decoration-foreground">
                  去登录
                </Link>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
