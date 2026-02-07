import { describe, expect, it } from 'vitest'
import { parseNetscapeBookmarksHtml } from './bookmarks.parser.js'

describe('parseNetscapeBookmarksHtml', () => {
  it('parses links, tags, note, and nested folder path from Netscape HTML', () => {
    const html = `
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks Menu</H1>
<DL><p>
  <DT><H3 ADD_DATE="1710000000">Frontend</H3>
  <DL><p>
    <DT><H3>React</H3>
    <DL><p>
      <DT><A HREF="https://example.com/react?utm_source=news" TAGS="react, hooks">React Hooks Guide</A>
      <DD>Great starter reference
    </DL><p>
  </DL><p>
  <DT><A HREF="https://example.com/top" TAGS="top-level">Top Item</A>
</DL><p>
`

    const parsed = parseNetscapeBookmarksHtml(html)
    expect(parsed.entries).toHaveLength(2)

    expect(parsed.entries[0]).toMatchObject({
      index_in_file: 0,
      folder_path: 'Frontend / React',
      source_tags: ['react', 'hooks'],
      source_note: 'Great starter reference',
      title_raw: 'React Hooks Guide',
      url_raw: 'https://example.com/react?utm_source=news',
      url_normalized: 'https://example.com/react',
      error_code: null,
    })

    expect(parsed.entries[1]).toMatchObject({
      index_in_file: 1,
      folder_path: null,
      source_tags: ['top-level'],
      source_note: null,
      title_raw: 'Top Item',
      url_normalized: 'https://example.com/top',
      error_code: null,
    })
  })

  it('marks unsupported and malformed URLs as invalid', () => {
    const html = `
<DL><p>
  <DT><A HREF="javascript:alert(1)">Bad Protocol</A>
  <DT><A HREF="https://valid.com/path">Valid</A>
  <DT><A HREF="not a url">Malformed</A>
</DL><p>
`

    const parsed = parseNetscapeBookmarksHtml(html)
    expect(parsed.entries).toHaveLength(3)
    expect(parsed.entries[0].error_code).toBe('UNSUPPORTED_URL_PROTOCOL')
    expect(parsed.entries[1].error_code).toBeNull()
    expect(parsed.entries[2].error_code).toBe('INVALID_URL')
  })
})
