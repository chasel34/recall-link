import { expect, test } from '@playwright/test'

test('AI settings flow: switch to user mode, save, and test', async ({ page }) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  }

  // Mock API
  await page.route('**/api/**', async (route) => {
    const url = route.request().url()
    const method = route.request().method()
    const origin = route.request().headers()['origin'] || '*'
    
    const headers = {
      ...corsHeaders,
      'Access-Control-Allow-Origin': origin,
    }

    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, headers })
      return
    }

    if (url.includes('/api/auth/me')) {
      await route.fulfill({
        status: 200,
        headers,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'user_1', email: 'test@example.com' },
        }),
      })
      return
    }

    if (url.includes('/api/settings/ai') && method === 'GET') {
      await route.fulfill({
        status: 200,
        headers,
        contentType: 'application/json',
        body: JSON.stringify({
          mode: 'server',
          provider: 'gemini',
          gemini: {
            model: 'gemini-3-flash-preview',
            baseUrl: '',
            hasApiKey: false,
          },
        }),
      })
      return
    }

    if (url.includes('/api/settings/ai') && method === 'PUT') {
      const body = JSON.parse(route.request().postData() || '{}')
      expect(body.mode).toBe('user')
      expect(body.gemini.apiKey).toBe('secret-key')
      expect(body.gemini.model).toBe('gemini-pro')
      expect(body.gemini.baseUrl).toBe('https://custom.api')

      await route.fulfill({
        status: 200,
        headers,
        contentType: 'application/json',
        body: JSON.stringify({
          mode: 'user',
          provider: 'gemini',
          gemini: {
            model: 'gemini-pro',
            baseUrl: 'https://custom.api',
            hasApiKey: true,
          },
        }),
      })
      return
    }

    if (url.includes('/api/settings/ai/test') && method === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}')
      expect(body.mode).toBe('user')
      expect(body.gemini.apiKey).toBe('secret-key')

      await route.fulfill({
        status: 200,
        headers,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      })
      return
    }

    await route.continue()
  })

  await page.goto('/settings/ai')

  // Switch to user mode
  await page.getByTestId('ai-mode-user').click()

  // Fill config
  await page.getByTestId('ai-api-key').fill('secret-key')
  await page.getByTestId('ai-base-url').fill('https://custom.api')
  await page.getByTestId('ai-model').fill('gemini-pro')

  // Save
  await page.getByTestId('ai-config-save').click()
  await expect(page.getByText('AI 配置已更新')).toBeVisible()

  // Re-fill key for testing (as save clears it for security)
  await page.getByTestId('ai-api-key').fill('secret-key')

  // Test
  await page.getByTestId('ai-config-test').click()
  await expect(page.getByText('测试成功')).toBeVisible()

  // Take screenshot as required
  await page.screenshot({ path: '.sisyphus/evidence/task-9-ai-config-test.png' })
})
