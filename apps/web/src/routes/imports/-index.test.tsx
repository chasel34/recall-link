import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ImportsPage } from './index'

const { useImportsMock, useCreateImportMock } = vi.hoisted(() => ({
  useImportsMock: vi.fn(),
  useCreateImportMock: vi.fn(),
}))

vi.mock('@/hooks/use-imports', () => ({
  useImports: useImportsMock,
  useCreateImport: useCreateImportMock,
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

describe('ImportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useCreateImportMock.mockReturnValue({ mutate: vi.fn(), isPending: false })
  })

  it('renders empty state when no imports exist', () => {
    useImportsMock.mockReturnValue({
      data: { imports: [], total: 0, limit: 20, offset: 0 },
      isLoading: false,
    })

    render(<ImportsPage />)

    expect(screen.getByText('暂无导入')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '上传 HTML' })).toHaveLength(2)
  })

  it('renders import rows and detail links', () => {
    useImportsMock.mockReturnValue({
      data: {
        imports: [
          {
            id: 'import_1',
            source_type: 'bookmarks_html',
            file_name: 'bookmarks.html',
            file_size_bytes: 4096,
            file_sha256: 'sha',
            status: 'processing',
            stats: {
              total_count: 12,
              created_count: 6,
              duplicate_existing_count: 2,
              duplicate_in_file_count: 1,
              invalid_count: 1,
              failed_count: 0,
              done_count: 8,
            },
            progress: {
              total_count: 12,
              done_count: 8,
              pending_count: 4,
              failed_count: 0,
              progress_percent: 67,
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
      },
      isLoading: false,
    })

    render(<ImportsPage />)

    expect(screen.getByText('bookmarks.html')).toBeInTheDocument()
    expect(screen.getByText('处理中')).toBeInTheDocument()
    expect(screen.getByText('67%')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /bookmarks.html/i })).toHaveAttribute('href', '/imports/import_1')
  })
})
