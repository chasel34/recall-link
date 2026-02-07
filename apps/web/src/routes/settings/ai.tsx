import React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AlertTriangle, Cpu, Globe, Key, Save, Trash2, X, Play } from 'lucide-react'
import { Button, Card, CardBody, CardHeader, Input, Spinner } from '@/components/base'
import {
  useAiSettings,
  DEFAULT_ARK_BASE_URL,
  DEFAULT_ARK_EMBEDDING_MODEL,
  DEFAULT_GEMINI_MODEL,
} from '@/hooks/ai-settings'
import { addToast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import type { AiMode } from '@/lib/api-client'

export const Route = createFileRoute('/settings/ai')({
  component: SettingsAiPage,
})

type DraftGemini = {
  apiKey: string
  baseURL: string
  model: string
}

type DraftArk = {
  apiKey: string
  baseURL: string
  embeddingModel: string
}

function SettingsAiPage() {
  const { settings, isLoading, isError, update, test, isUpdating, isTesting } = useAiSettings()

  const [draftMode, setDraftMode] = React.useState<AiMode>('server')
  const [draftGemini, setDraftGemini] = React.useState<DraftGemini>({
    apiKey: '',
    baseURL: '',
    model: DEFAULT_GEMINI_MODEL,
  })
  const [draftArk, setDraftArk] = React.useState<DraftArk>({
    apiKey: '',
    baseURL: DEFAULT_ARK_BASE_URL,
    embeddingModel: DEFAULT_ARK_EMBEDDING_MODEL,
  })
  const [submitAttempted, setSubmitAttempted] = React.useState(false)

  React.useEffect(() => {
    if (!settings) return
    setDraftMode(settings.mode)
    setDraftGemini({
      apiKey: '', // Never fill API key from server
      baseURL: settings.gemini.baseUrl,
      model: settings.gemini.model,
    })
    setDraftArk({
      apiKey: '',
      baseURL: settings.ark.baseUrl,
      embeddingModel: settings.ark.embeddingModel,
    })
  }, [settings])

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner className="h-6 w-6 text-muted-foreground" />
      </div>
    )
  }

  if (isError || !settings) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        Failed to load settings
      </div>
    )
  }

  const savedBaseURL = (settings.gemini.baseUrl ?? '').trim()
  const draftBaseURL = draftGemini.baseURL.trim()
  const savedModel = settings.gemini.model
  const draftModel = draftGemini.model.trim()
  const savedArkBaseURL = (settings.ark.baseUrl ?? '').trim()
  const draftArkBaseURL = draftArk.baseURL.trim()
  const savedArkModel = settings.ark.embeddingModel
  const draftArkModel = draftArk.embeddingModel.trim()

  const isDirty =
    draftMode !== settings.mode ||
    draftGemini.apiKey !== '' ||
    draftArk.apiKey !== '' ||
    draftBaseURL !== savedBaseURL ||
    draftModel !== savedModel ||
    draftArkBaseURL !== savedArkBaseURL ||
    draftArkModel !== savedArkModel

  const missingApiKey = draftMode === 'user' && !settings.gemini.hasApiKey && !draftGemini.apiKey.trim()
  const missingArkApiKey = draftMode === 'user' && !settings.ark.hasApiKey && !draftArk.apiKey.trim()

  const onCancel = () => {
    setDraftMode(settings.mode)
    setDraftGemini({
      apiKey: '',
      baseURL: settings.gemini.baseUrl,
      model: settings.gemini.model,
    })
    setDraftArk({
      apiKey: '',
      baseURL: settings.ark.baseUrl,
      embeddingModel: settings.ark.embeddingModel,
    })
    setSubmitAttempted(false)
  }

  const onSave = () => {
    setSubmitAttempted(true)

    if (draftMode === 'user') {
       if (!draftGemini.apiKey.trim() && !settings.gemini.hasApiKey) {
         return
       }
       if (!draftArk.apiKey.trim() && !settings.ark.hasApiKey) {
         return
       }
    }

    const payload =
      draftMode === 'server'
        ? { mode: 'server' as const, provider: 'gemini' as const, ark: {} }
        : {
            mode: 'user' as const,
            provider: 'gemini' as const,
            gemini: {
              ...(draftGemini.apiKey.trim() ? { apiKey: draftGemini.apiKey.trim() } : {}),
              model: draftGemini.model.trim() || DEFAULT_GEMINI_MODEL,
              baseUrl: draftGemini.baseURL.trim(),
            },
            ark: {
              ...(draftArk.apiKey.trim() ? { apiKey: draftArk.apiKey.trim() } : {}),
              embeddingModel: draftArk.embeddingModel.trim() || DEFAULT_ARK_EMBEDDING_MODEL,
              baseUrl: draftArk.baseURL.trim(),
            }
          }

    update(payload as any, {
      onSuccess: () => {
        addToast({ title: '已保存', description: 'AI 配置已更新', color: 'success' })
        // setDraftGemini(s => ({ ...s, apiKey: '' })) // Keep key in form for testing
        setSubmitAttempted(false)
      }
    })
  }

  const onTest = () => {
    if (draftMode === 'user' && !draftGemini.apiKey.trim() && !settings.gemini.hasApiKey) {
       addToast({ title: '需要 API Key', description: '请输入 API Key 进行测试', color: 'danger' })
       return
    }
    if (draftMode === 'user' && !draftArk.apiKey.trim() && !settings.ark.hasApiKey) {
      addToast({ title: '需要 Ark API Key', description: '请输入 Ark API Key 进行测试', color: 'danger' })
      return
    }

    const payload = {
      mode: draftMode,
      provider: 'gemini' as const,
      gemini: {
        apiKey: draftGemini.apiKey.trim(),
        baseUrl: draftGemini.baseURL.trim(),
        model: draftGemini.model.trim() || DEFAULT_GEMINI_MODEL,
      },
      ark: {
        apiKey: draftArk.apiKey.trim(),
        baseUrl: draftArk.baseURL.trim(),
        embeddingModel: draftArk.embeddingModel.trim() || DEFAULT_ARK_EMBEDDING_MODEL,
      }
    }
    
    test(payload as any, {
      onSuccess: () => addToast({ title: '测试成功', description: 'API 连接正常', color: 'success' }),
      onError: (err) => addToast({ title: '测试失败', description: err.message, color: 'danger' })
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
                  draftMode === 'server'
                    ? 'bg-card shadow-[var(--shadow-card)] ring-1 ring-border/60'
                    : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-card/60'
                )}
                startContent={<Globe className="w-4 h-4" />}
                onPress={() => setDraftMode('server')}
                aria-label="选择服务端模式"
                data-testid="ai-mode-server"
              >
                服务端模式
              </Button>
              <Button
                variant="flat"
                className={cn(
                  'flex-1 justify-start h-10',
                  draftMode === 'user'
                    ? 'bg-card shadow-[var(--shadow-card)] ring-1 ring-border/60'
                    : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-card/60'
                )}
                startContent={<Cpu className="w-4 h-4" />}
                onPress={() => setDraftMode('user')}
                aria-label="选择用户模式"
                data-testid="ai-mode-user"
              >
                用户模式
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              {draftMode === 'server' ? '使用服务端 AI 处理。' : '使用您自己的 API Key 进行推理。'}
            </div>
          </div>

          {draftMode === 'user' && (
            <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-amber-700">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">安全提醒</p>
                  <p className="opacity-90">
                    Gemini 与 Ark API Key 都会加密存储在服务器上。
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
                      placeholder={settings.gemini.hasApiKey ? '已设置 (输入新 Key 以覆盖)' : 'AIza...'}
                      value={draftGemini.apiKey}
                      onValueChange={(val) => setDraftGemini((s) => ({ ...s, apiKey: val }))}
                      startContent={<Key className="w-4 h-4" />}
                      className="font-mono"
                      isInvalid={submitAttempted && missingApiKey}
                      errorMessage={submitAttempted && missingApiKey ? '需要 API Key' : null}
                      data-testid="ai-api-key"
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
                      data-testid="ai-base-url"
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
                      data-testid="ai-model"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-border/60">
                  <div className="text-sm font-medium ml-1">Ark Embedding（用于语义检索）</div>

                  <div className="space-y-2">
                    <label htmlFor="ark-api-key" className="text-sm font-medium ml-1">
                      Ark API Key
                    </label>
                    <div className="flex gap-2">
                      <Input
                        id="ark-api-key"
                        type="password"
                        placeholder={settings.ark.hasApiKey ? '已设置 (输入新 Key 以覆盖)' : 'ark-...'}
                        value={draftArk.apiKey}
                        onValueChange={(val) => setDraftArk((s) => ({ ...s, apiKey: val }))}
                        startContent={<Key className="w-4 h-4" />}
                        className="font-mono"
                        isInvalid={submitAttempted && missingArkApiKey}
                        errorMessage={submitAttempted && missingArkApiKey ? '需要 Ark API Key' : null}
                        data-testid="ark-api-key"
                      />
                      {draftArk.apiKey && (
                        <Button
                          isIconOnly
                          variant="light"
                          color="danger"
                          className="flex-shrink-0"
                          onPress={() => setDraftArk((s) => ({ ...s, apiKey: '' }))}
                          aria-label="清除 Ark API Key"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="ark-base-url" className="text-sm font-medium ml-1">
                        Ark Base URL
                      </label>
                      <Input
                        id="ark-base-url"
                        placeholder={DEFAULT_ARK_BASE_URL}
                        value={draftArk.baseURL}
                        onValueChange={(val) => setDraftArk((s) => ({ ...s, baseURL: val }))}
                        className="font-mono text-sm"
                        data-testid="ark-base-url"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="ark-model" className="text-sm font-medium ml-1">
                        Embedding 模型
                      </label>
                      <Input
                        id="ark-model"
                        placeholder={DEFAULT_ARK_EMBEDDING_MODEL}
                        value={draftArk.embeddingModel}
                        onValueChange={(val) => setDraftArk((s) => ({ ...s, embeddingModel: val }))}
                        className="font-mono text-sm"
                        data-testid="ark-model"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
               {draftMode === 'user' && (
                 <Button
                   variant="light"
                   isDisabled={
                    (!draftGemini.apiKey && !settings.gemini.hasApiKey) ||
                    (!draftArk.apiKey && !settings.ark.hasApiKey)
                   }
                   startContent={isTesting ? <Spinner className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                   onPress={onTest}
                   data-testid="ai-config-test"
                 >
                   测试连接
                 </Button>
               )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="light"
                isDisabled={!isDirty || isUpdating}
                startContent={<X className="w-4 h-4" />}
                onPress={onCancel}
              >
                放弃更改
              </Button>
              <Button
                color="primary"
                isDisabled={!isDirty || isUpdating}
                isLoading={isUpdating}
                startContent={!isUpdating && <Save className="w-4 h-4" />}
                onPress={onSave}
                data-testid="ai-config-save"
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
