import { beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { ImportDetailPageContent } from './$id'

const { useImportMock, useImportEntriesMock } = vi.hoisted(() => ({
  useImportMock: vi.fn(),
  useImportEntriesMock: vi.fn(),
}))

vi.mock('@/hooks/use-imports', () => ({
  useImport: useImportMock,
  useImportEntries: useImportEntriesMock,
}))

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router')
  return {
    ...actual,
    Link: ({ to, params, children, ...props }: any) => {
      let href = typeof to === 'string' ? to : ''
      if (params && typeof params === 'object') {
        Object.entries(params).forEach(([key, value]) => {
          href = href.replace(`$${key}`, String(value))
        })
      }
      return (
        <a href={href} {...props}>
          {children}
        </a>
      )
    },
  }
})

describe('ImportDetailPageContent', () => {
  beforeEach(() => {
    cleanup()
    vi.clearAllMocks()

    useImportMock.mockReturnValue({
      data: {
        id: 'import_1',
        source_type: 'bookmarks_html',
        file_name: 'bookmarks.html',
        file_size_bytes: 4096,
        file_sha256: 'sha',
        status: 'processing',
        stats: {
          total_count: 3,
          created_count: 1,
          duplicate_existing_count: 1,
          duplicate_in_file_count: 0,
          invalid_count: 1,
          failed_count: 0,
          done_count: 2,
        },
        progress: {
          total_count: 3,
          done_count: 2,
          pending_count: 1,
          failed_count: 0,
          progress_percent: 67,
        },
        entry_status_counts: {
          done: 1,
          duplicate_existing: 1,
          invalid: 1,
        },
        started_at: null,
        finished_at: null,
        error_message: null,
        created_at: '2026-01-27T12:00:00.000Z',
        updated_at: '2026-01-27T12:00:00.000Z',
      },
      isLoading: false,
    })

    useImportEntriesMock.mockReturnValue({
      data: {
        import_id: 'import_1',
        total: 2,
        limit: 50,
        offset: 0,
        entries: [
          {
            id: 'entry_1',
            import_id: 'import_1',
            index_in_file: 0,
            folder_path: null,
            source_tags: null,
            source_note: null,
            url_raw: 'https://example.com/a',
            url_normalized: 'https://example.com/a',
            title_raw: 'Entry A',
            status: 'done',
            item_id: 'item_1',
            error_code: null,
            error_message: null,
            created_at: '2026-01-27T12:00:00.000Z',
            updated_at: '2026-01-27T12:00:00.000Z',
          },
          {
            id: 'entry_2',
            import_id: 'import_1',
            index_in_file: 1,
            folder_path: null,
            source_tags: null,
            source_note: null,
            url_raw: 'https://example.com/b',
            url_normalized: null,
            title_raw: 'Entry B',
            status: 'failed',
            item_id: null,
            error_code: 'EMBEDDING_FAILED',
            error_message: 'Embedding failed',
            created_at: '2026-01-27T12:00:00.000Z',
            updated_at: '2026-01-27T12:00:00.000Z',
          },
        ],
      },
      isLoading: false,
    })
  })

  it('renders detail stats and entries for /imports/$id', () => {
    render(<ImportDetailPageContent id="import_1" status={undefined} onStatusChange={vi.fn()} />)

    expect(screen.getByText('bookmarks.html')).toBeInTheDocument()
    expect(screen.getByText('总项目数')).toBeInTheDocument()
    expect(screen.getByText('Entry A')).toBeInTheDocument()
    expect(screen.getByText('Embedding failed')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /查看项目/i })).toHaveAttribute('href', '/items/item_1')
  })

  it('updates filter state when a filter pill is pressed', () => {
    const onStatusChange = vi.fn()

    render(<ImportDetailPageContent id="import_1" status={undefined} onStatusChange={onStatusChange} />)
    const failedFilters = screen.getAllByRole('button', { name: '失败' })
    fireEvent.click(failedFilters[failedFilters.length - 1])

    expect(onStatusChange).toHaveBeenCalledWith('failed')
  })

  it('renders empty state for filtered results', () => {
    useImportEntriesMock.mockReturnValue({
      data: {
        import_id: 'import_1',
        total: 0,
        limit: 50,
        offset: 0,
        entries: [],
      },
      isLoading: false,
    })

    render(<ImportDetailPageContent id="import_1" status="failed" onStatusChange={vi.fn()} />)

    expect(screen.getByText('未找到条目')).toBeInTheDocument()
    const failedFilters = screen.getAllByRole('button', { name: '失败' })
    expect(failedFilters[failedFilters.length - 1]).toHaveAttribute('aria-pressed', 'true')
  })
})
