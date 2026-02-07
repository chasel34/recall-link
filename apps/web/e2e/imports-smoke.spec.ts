import { expect, test } from '@playwright/test'

test('imports smoke: list, detail, and status filter', async ({ page }) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'http://127.0.0.1:3001',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  }

  await page.route('**/api/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders })
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

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({ user: { id: 'user_1', email: 'test@example.com' } }),
    })
  })

  await page.route('**/api/imports', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({
        imports: [
          {
            id: 'import_1',
            source_type: 'bookmarks_html',
            file_name: 'bookmarks.html',
            file_size_bytes: 2048,
            file_sha256: 'sha',
            status: 'processing',
            stats: {
              total_count: 2,
              created_count: 1,
              duplicate_existing_count: 0,
              duplicate_in_file_count: 0,
              invalid_count: 1,
              failed_count: 0,
              done_count: 1,
            },
            progress: {
              total_count: 2,
              done_count: 1,
              pending_count: 1,
              failed_count: 0,
              progress_percent: 50,
            },
            started_at: null,
            finished_at: null,
            error_message: null,
            created_at: '2026-01-27T12:00:00.000Z',
            updated_at: '2026-01-27T12:00:00.000Z',
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      }),
    })
  })

  await page.route('**/api/imports/import_1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({
        id: 'import_1',
        source_type: 'bookmarks_html',
        file_name: 'bookmarks.html',
        file_size_bytes: 2048,
        file_sha256: 'sha',
        status: 'processing',
        stats: {
          total_count: 2,
          created_count: 1,
          duplicate_existing_count: 0,
          duplicate_in_file_count: 0,
          invalid_count: 1,
          failed_count: 0,
          done_count: 1,
        },
        progress: {
          total_count: 2,
          done_count: 1,
          pending_count: 1,
          failed_count: 0,
          progress_percent: 50,
        },
        started_at: null,
        finished_at: null,
        error_message: null,
        created_at: '2026-01-27T12:00:00.000Z',
        updated_at: '2026-01-27T12:00:00.000Z',
      }),
    })
  })

  await page.route('**/api/imports/import_1/entries**', async (route) => {
    const url = new URL(route.request().url())
    const status = url.searchParams.get('status')
    const entries = status === 'failed'
      ? [
          {
            id: 'entry_failed',
            import_id: 'import_1',
            index_in_file: 1,
            folder_path: null,
            source_tags: null,
            source_note: null,
            url_raw: 'https://example.com/b',
            url_normalized: null,
            title_raw: 'Broken entry',
            status: 'failed',
            item_id: null,
            error_code: 'EMBEDDING_FAILED',
            error_message: 'Embedding failed',
            created_at: '2026-01-27T12:00:00.000Z',
            updated_at: '2026-01-27T12:00:00.000Z',
          },
        ]
      : [
          {
            id: 'entry_done',
            import_id: 'import_1',
            index_in_file: 0,
            folder_path: null,
            source_tags: null,
            source_note: null,
            url_raw: 'https://example.com/a',
            url_normalized: 'https://example.com/a',
            title_raw: 'Done entry',
            status: 'done',
            item_id: 'item_1',
            error_code: null,
            error_message: null,
            created_at: '2026-01-27T12:00:00.000Z',
            updated_at: '2026-01-27T12:00:00.000Z',
          },
          {
            id: 'entry_failed',
            import_id: 'import_1',
            index_in_file: 1,
            folder_path: null,
            source_tags: null,
            source_note: null,
            url_raw: 'https://example.com/b',
            url_normalized: null,
            title_raw: 'Broken entry',
            status: 'failed',
            item_id: null,
            error_code: 'EMBEDDING_FAILED',
            error_message: 'Embedding failed',
            created_at: '2026-01-27T12:00:00.000Z',
            updated_at: '2026-01-27T12:00:00.000Z',
          },
        ]

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: corsHeaders,
      body: JSON.stringify({
        import_id: 'import_1',
        entries,
        total: entries.length,
        limit: 50,
        offset: 0,
      }),
    })
  })

  await page.goto('/imports')
  await expect(page.getByRole('heading', { name: '导入书签' })).toBeVisible()
  await expect(page.getByText('bookmarks.html')).toBeVisible()

  await page.getByRole('link', { name: /bookmarks.html/i }).click()
  await expect(page).toHaveURL(/\/imports\/import_1$/)
  await expect(page.getByText('Done entry')).toBeVisible()

  await page.getByRole('button', { name: '失败' }).click()
  await expect(page).toHaveURL(/status=failed/)
  await expect(page.getByText('Broken entry')).toBeVisible()
})
