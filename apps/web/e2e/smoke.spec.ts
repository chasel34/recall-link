import { expect, test } from '@playwright/test'

const sessionId = 'chat_test'
const userMessageId = 'msg_user'
const assistantMessageId = 'msg_ai'

test('chat smoke flow renders assistant response', async ({ page }) => {
  const now = new Date('2026-01-27T12:00:00.000Z').toISOString()
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  await page.route('**/api/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: corsHeaders,
      })
      return
    }

    await route.fallback()
  })

  await page.route('**/api/items/events', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: corsHeaders,
      body: 'event: noop\ndata: {}\n\n',
    })
  })

  await page.route('**/api/chat/sessions', async (route) => {
    const method = route.request().method()
    if (method === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          id: sessionId,
          title: null,
          created_at: now,
          updated_at: now,
        }),
      })
      return
    }

    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          sessions: [
            {
              id: sessionId,
              title: null,
              created_at: now,
              updated_at: now,
            },
          ],
          total: 1,
          limit: 20,
          offset: 0,
        }),
      })
      return
    }

    await route.fallback()
  })

  await page.route('**/api/chat/sessions/*/messages', async (route) => {
    const method = route.request().method()
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: corsHeaders,
        body: JSON.stringify({
          messages: [
            {
              id: userMessageId,
              session_id: sessionId,
              role: 'user',
              content: 'Where did we save my notes?',
              meta_json: null,
              created_at: now,
            },
            {
              id: assistantMessageId,
              session_id: sessionId,
              role: 'assistant',
              content: 'Hello from Recall. <sources><source title="Example Source" url="https://example.com" item_id="item_1" /></sources>',
              meta_json: JSON.stringify({
                sources: [
                  {
                    item_id: 'item_1',
                    url: 'https://example.com',
                    title: 'Example Source',
                    snippet: 'Example snippet.',
                  },
                ],
              }),
              created_at: now,
            },
          ],
        }),
      })
      return
    }

    if (method === 'POST') {
      const sseBody = [
        [
          'event: meta',
          `data: ${JSON.stringify({
            session_id: sessionId,
            user_message_id: userMessageId,
            assistant_message_id: assistantMessageId,
            sources: [
              {
                item_id: 'item_1',
                url: 'https://example.com',
                title: 'Example Source',
                snippet: 'Example snippet.',
              },
            ],
          })}`,
        ].join('\n'),
        [
          'event: delta',
          `data: ${JSON.stringify({
            delta: 'Hello from Recall.',
          })}`,
        ].join('\n'),
        [
          'event: delta',
          `data: ${JSON.stringify({
            delta: '<sources><source title="Example Source" url="https://example.com" item_id="item_1" /></sources>',
          })}`,
        ].join('\n'),
        [
          'event: done',
          `data: ${JSON.stringify({ assistant_message_id: assistantMessageId })}`,
        ].join('\n'),
      ].join('\n\n') + '\n\n'

      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: corsHeaders,
        body: sseBody,
      })
      return
    }

    await route.fallback()
  })

  await page.goto(`/chat/${sessionId}?q=Where%20did%20we%20save%20my%20notes%3F`)

  await expect(page).toHaveURL(new RegExp(`/chat/${sessionId}`))
  await expect(page.getByText('Hello from Recall', { exact: false })).toBeVisible()

  // Verify no sidebar/drawer
  await expect(page.getByText('Sources will appear here')).not.toBeVisible()
  await expect(page.getByRole('heading', { name: /^Sources\s*\(/ })).not.toBeVisible()

  // Verify inline sources render inside the assistant bubble
  await expect(page.getByText('Sources', { exact: true })).toBeVisible()
  const sourceLink = page.getByRole('link', { name: 'Example Source' })
  await expect(sourceLink).toBeVisible()
  await expect(sourceLink).toHaveAttribute('href', /.*\/items\/item_1/)
})
