import { createFileRoute } from '@tanstack/react-router'
import { useAiSettings, DEFAULT_GEMINI_MODEL } from '@/hooks/ai-settings'
import { Card, CardHeader, CardBody, Input, Button } from '@/components/base'
import { AlertTriangle, Key, Trash2, Cpu, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { mode, gemini, setMode, setGeminiConfig } = useAiSettings()

  return (
    <div className="container max-w-2xl mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-serif font-medium text-foreground">设置</h1>
        <p className="text-muted-foreground">管理应用偏好和 AI 配置</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-xl font-medium flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              AI 模式
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setMode('remote')}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer",
                  mode === 'remote'
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-border/40 bg-card hover:bg-muted/30 text-muted-foreground hover:border-border"
                )}
              >
                <Globe className="w-8 h-8 mb-2" />
                <span className="font-medium">远程模式</span>
                <span className="text-xs mt-1 opacity-80">使用官方服务</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('local')}
                className={cn(
                  "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer",
                  mode === 'local'
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-border/40 bg-card hover:bg-muted/30 text-muted-foreground hover:border-border"
                )}
              >
                <Cpu className="w-8 h-8 mb-2" />
                <span className="font-medium">本地模式</span>
                <span className="text-xs mt-1 opacity-80">自带 API Key</span>
              </button>
            </div>

            {mode === 'local' && (
              <div className="pt-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">安全警告</p>
                    <p className="opacity-90">
                      您的 API Key 将以明文形式存储在浏览器的 LocalStorage 中。
                      请勿在公共设备上使用此模式。
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <label htmlFor="gemini-api-key" className="text-sm font-medium ml-1">Google Gemini API Key</label>
                    <div className="flex gap-2">
                      <Input
                        id="gemini-api-key"
                        type="password"
                        placeholder="sk-..."
                        value={gemini.apiKey}
                        onValueChange={(val) => setGeminiConfig({ apiKey: val })}
                        startContent={<Key className="w-4 h-4" />}
                        className="font-mono"
                        isInvalid={!gemini.apiKey}
                        errorMessage={!gemini.apiKey ? "需要 API Key 才能使用本地模式" : null}
                      />
                      {gemini.apiKey && (
                        <Button
                          isIconOnly
                          variant="light"
                          color="danger"
                          className="flex-shrink-0"
                          onPress={() => setGeminiConfig({ apiKey: '' })}
                          aria-label="清除 API Key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="gemini-base-url" className="text-sm font-medium ml-1">Base URL (可选)</label>
                      <Input
                        id="gemini-base-url"
                        placeholder="https://generativelanguage.googleapis.com/v1beta"
                        value={gemini.baseURL || ''}
                        onValueChange={(val) => setGeminiConfig({ baseURL: val || undefined })}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="gemini-model" className="text-sm font-medium ml-1">模型</label>
                      <Input
                        id="gemini-model"
                        placeholder={DEFAULT_GEMINI_MODEL}
                        value={gemini.model}
                        onValueChange={(val) => setGeminiConfig({ model: val || DEFAULT_GEMINI_MODEL })}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
