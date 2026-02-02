import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AlertTriangle, Cpu, Globe, Key, Save, Trash2, X } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, Input } from '@/components/base'
import { useAiSettings, DEFAULT_GEMINI_MODEL } from '@/hooks/ai-settings'
import { addToast } from '@/lib/toast'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/settings/ai')({
  component: SettingsAiPage,
})

type DraftGemini = {
  apiKey: string
  baseURL: string
  model: string
}

function SettingsAiPage() {
  const { mode, gemini, setMode, setGeminiConfig } = useAiSettings()

  const [draftMode, setDraftMode] = React.useState(mode)
  const [draftGemini, setDraftGemini] = React.useState<DraftGemini>({
    apiKey: gemini.apiKey,
    baseURL: gemini.baseURL ?? '',
    model: gemini.model,
  })
  const [submitAttempted, setSubmitAttempted] = React.useState(false)

  const savedBaseURL = (gemini.baseURL ?? '').trim()
  const draftBaseURL = draftGemini.baseURL.trim()

  const isDirty =
    draftMode !== mode ||
    draftGemini.apiKey !== gemini.apiKey ||
    draftBaseURL !== savedBaseURL ||
    draftGemini.model !== gemini.model

  React.useEffect(() => {
    if (isDirty) return
    setDraftMode(mode)
    setDraftGemini({
      apiKey: gemini.apiKey,
      baseURL: gemini.baseURL ?? '',
      model: gemini.model,
    })
    setSubmitAttempted(false)
  }, [isDirty, mode, gemini.apiKey, gemini.baseURL, gemini.model])

  const missingApiKey = draftMode === 'local' && !draftGemini.apiKey.trim()

  const onCancel = () => {
    setDraftMode(mode)
    setDraftGemini({
      apiKey: gemini.apiKey,
      baseURL: gemini.baseURL ?? '',
      model: gemini.model,
    })
    setSubmitAttempted(false)
  }

  const onSave = () => {
    setSubmitAttempted(true)

    if (draftMode === 'local' && !draftGemini.apiKey.trim()) {
      return
    }

    setGeminiConfig({
      apiKey: draftGemini.apiKey,
      baseURL: draftGemini.baseURL.trim() ? draftGemini.baseURL.trim() : undefined,
      model: draftGemini.model.trim() ? draftGemini.model.trim() : DEFAULT_GEMINI_MODEL,
    })
    setMode(draftMode)

    addToast({
      title: '已保存',
      description: 'AI 配置已更新',
      color: 'success',
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-10 space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-[var(--shadow-card)]">
            <Cpu className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground/90">AI</h1>
            <p className="mt-1 text-sm text-muted-foreground">配置运行模式与本地推理所需的凭据</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-lg font-medium text-foreground">模式与密钥</div>
              <div className="mt-1 text-sm text-muted-foreground">更改不会立刻生效，点击保存后才会应用</div>
            </div>
            {isDirty && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                有未保存更改
              </div>
            )}
          </div>
        </CardHeader>
        <CardBody className="space-y-6">
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground/90">运行模式</div>
            <div className="inline-flex w-full items-center bg-muted/50 p-1 rounded-xl ring-1 ring-border/60">
              <Button
                variant="flat"
                className={cn(
                  'flex-1 justify-start h-10',
                  draftMode === 'remote'
                    ? 'bg-card shadow-[var(--shadow-card)] ring-1 ring-border/60'
                    : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-card/60'
                )}
                startContent={<Globe className="w-4 h-4" />}
                onPress={() => setDraftMode('remote')}
                aria-label="选择远程模式"
              >
                远程模式
              </Button>
              <Button
                variant="flat"
                className={cn(
                  'flex-1 justify-start h-10',
                  draftMode === 'local'
                    ? 'bg-card shadow-[var(--shadow-card)] ring-1 ring-border/60'
                    : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-card/60'
                )}
                startContent={<Cpu className="w-4 h-4" />}
                onPress={() => setDraftMode('local')}
                aria-label="选择本地模式"
              >
                本地模式
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              {draftMode === 'remote' ? '使用服务端 AI 处理。' : '在浏览器内使用 Gemini API Key 进行本地推理。'}
            </div>
          </div>

          {draftMode === 'local' && (
            <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-amber-700">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">安全提醒</p>
                  <p className="opacity-90">
                    API Key 会以明文形式存储在浏览器的 LocalStorage 中。请勿在公共设备上使用。
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="gemini-api-key" className="text-sm font-medium ml-1">
                    Google Gemini API Key
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="gemini-api-key"
                      type="password"
                      placeholder="AIza..."
                      value={draftGemini.apiKey}
                      onValueChange={(val) => setDraftGemini((s) => ({ ...s, apiKey: val }))}
                      startContent={<Key className="w-4 h-4" />}
                      className="font-mono"
                      isInvalid={submitAttempted && missingApiKey}
                      errorMessage={submitAttempted && missingApiKey ? '需要 API Key 才能使用本地模式' : null}
                    />
                    {draftGemini.apiKey && (
                      <Button
                        isIconOnly
                        variant="light"
                        color="danger"
                        className="flex-shrink-0"
                        onPress={() => setDraftGemini((s) => ({ ...s, apiKey: '' }))}
                        aria-label="清除 API Key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="gemini-base-url" className="text-sm font-medium ml-1">
                      Base URL (可选)
                    </label>
                    <Input
                      id="gemini-base-url"
                      placeholder="https://generativelanguage.googleapis.com/v1beta"
                      value={draftGemini.baseURL}
                      onValueChange={(val) => setDraftGemini((s) => ({ ...s, baseURL: val }))}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="gemini-model" className="text-sm font-medium ml-1">
                      模型
                    </label>
                    <Input
                      id="gemini-model"
                      placeholder={DEFAULT_GEMINI_MODEL}
                      value={draftGemini.model}
                      onValueChange={(val) => setDraftGemini((s) => ({ ...s, model: val }))}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              {isDirty ? '尚未保存。' : '已与当前配置同步。'}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="light"
                isDisabled={!isDirty}
                startContent={<X className="w-4 h-4" />}
                onPress={onCancel}
              >
                放弃更改
              </Button>
              <Button
                color="primary"
                isDisabled={!isDirty}
                startContent={<Save className="w-4 h-4" />}
                onPress={onSave}
              >
                保存
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
