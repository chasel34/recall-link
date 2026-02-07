import { normalizeUrl } from '../../lib/utils.js'

type ParsedBookmarkErrorCode = 'INVALID_URL' | 'UNSUPPORTED_URL_PROTOCOL'

export type ParsedBookmarkEntry = {
  index_in_file: number
  folder_path: string | null
  source_tags: string[]
  source_note: string | null
  url_raw: string
  url_normalized: string | null
  title_raw: string | null
  error_code: ParsedBookmarkErrorCode | null
}

export type ParsedBookmarksResult = {
  entries: ParsedBookmarkEntry[]
}

const TAG_REGEX = /<!--[\s\S]*?-->|<\/?[a-zA-Z0-9:_-]+(?:\s+[^<>]*?)?>/g
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (entity, token: string) => {
    if (token.startsWith('#x') || token.startsWith('#X')) {
      const codePoint = Number.parseInt(token.slice(2), 16)
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity
    }

    if (token.startsWith('#')) {
      const codePoint = Number.parseInt(token.slice(1), 10)
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity
    }

    return NAMED_ENTITIES[token] ?? entity
  })
}

function normalizeText(input: string): string {
  return decodeHtmlEntities(input).replace(/\s+/g, ' ').trim()
}

function parseTagName(tag: string): string | null {
  const match = tag.match(/^<\/?\s*([a-zA-Z0-9:_-]+)/)
  return match ? match[1].toLowerCase() : null
}

function parseAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {}
  const withoutAngleBrackets = tag.replace(/^<\/?\s*/, '').replace(/\/?\s*>$/, '')
  const firstWhitespace = withoutAngleBrackets.search(/\s/)
  if (firstWhitespace < 0) {
    return attributes
  }

  const attrChunk = withoutAngleBrackets.slice(firstWhitespace + 1)
  const attrRegex = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g

  let match = attrRegex.exec(attrChunk)
  while (match) {
    const name = match[1]?.toLowerCase()
    if (name) {
      const rawValue = match[2] ?? match[3] ?? match[4] ?? ''
      attributes[name] = decodeHtmlEntities(rawValue)
    }
    match = attrRegex.exec(attrChunk)
  }

  return attributes
}

function normalizeBookmarkUrl(urlRaw: string): { normalized: string | null; errorCode: ParsedBookmarkErrorCode | null } {
  try {
    const parsed = new URL(urlRaw)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { normalized: null, errorCode: 'UNSUPPORTED_URL_PROTOCOL' }
    }

    return { normalized: normalizeUrl(parsed.toString()), errorCode: null }
  } catch {
    return { normalized: null, errorCode: 'INVALID_URL' }
  }
}

export function parseNetscapeBookmarksHtml(html: string): ParsedBookmarksResult {
  const entries: ParsedBookmarkEntry[] = []
  const folderStack: string[] = []
  const dlKinds: Array<'root' | 'folder'> = []

  let pendingFolderTitle: string | null = null
  let activeTag: 'a' | 'h3' | 'dd' | null = null
  let activeText = ''
  let activeAnchorAttrs: Record<string, string> | null = null
  let lastEntryIndex: number | null = null

  const finalizeDd = () => {
    if (activeTag !== 'dd') {
      return
    }
    const note = normalizeText(activeText)
    if (note && lastEntryIndex !== null) {
      const existing = entries[lastEntryIndex]
      if (existing) {
        existing.source_note = existing.source_note
          ? `${existing.source_note}\n${note}`
          : note
      }
    }
    activeTag = null
    activeText = ''
  }

  const finalizeH3 = () => {
    if (activeTag !== 'h3') {
      return
    }
    const title = normalizeText(activeText)
    pendingFolderTitle = title || null
    activeTag = null
    activeText = ''
  }

  const finalizeA = () => {
    if (activeTag !== 'a') {
      return
    }

    const urlRaw = (activeAnchorAttrs?.href ?? '').trim()
    const titleRaw = normalizeText(activeText) || null
    const tagsRaw = activeAnchorAttrs?.tags ?? ''
    const sourceTags = tagsRaw
      .split(',')
      .map((tag) => normalizeText(tag))
      .filter((tag) => tag.length > 0)

    const { normalized, errorCode } = normalizeBookmarkUrl(urlRaw)

    const entry: ParsedBookmarkEntry = {
      index_in_file: entries.length,
      folder_path: folderStack.length > 0 ? folderStack.join(' / ') : null,
      source_tags: sourceTags,
      source_note: null,
      url_raw: urlRaw,
      url_normalized: normalized,
      title_raw: titleRaw,
      error_code: errorCode,
    }

    entries.push(entry)
    lastEntryIndex = entries.length - 1

    activeTag = null
    activeText = ''
    activeAnchorAttrs = null
  }

  const flushByOpeningTag = (tagName: string) => {
    if (activeTag === 'a' && tagName !== 'a') {
      finalizeA()
    }
    if (activeTag === 'h3' && tagName !== 'h3') {
      finalizeH3()
    }
    if (activeTag === 'dd' && !['dd', 'p', 'br'].includes(tagName)) {
      finalizeDd()
    }
  }

  let lastIndex = 0
  let match = TAG_REGEX.exec(html)

  while (match) {
    const tag = match[0]
    const textChunk = html.slice(lastIndex, match.index)
    if (activeTag) {
      activeText += textChunk
    }

    const name = parseTagName(tag)
    if (name) {
      const isClosing = /^<\//.test(tag)

      if (isClosing) {
        if (name === 'a') {
          finalizeA()
        } else if (name === 'h3') {
          finalizeH3()
        } else if (name === 'dd') {
          finalizeDd()
        } else if (name === 'dl') {
          finalizeDd()
          const kind = dlKinds.pop()
          if (kind === 'folder') {
            folderStack.pop()
          }
        }
      } else {
        flushByOpeningTag(name)

        if (name === 'a') {
          activeTag = 'a'
          activeText = ''
          activeAnchorAttrs = parseAttributes(tag)
        } else if (name === 'h3') {
          activeTag = 'h3'
          activeText = ''
        } else if (name === 'dd') {
          activeTag = 'dd'
          activeText = ''
        } else if (name === 'dl') {
          if (pendingFolderTitle) {
            folderStack.push(pendingFolderTitle)
            dlKinds.push('folder')
            pendingFolderTitle = null
          } else {
            dlKinds.push('root')
          }
        }
      }
    }

    lastIndex = TAG_REGEX.lastIndex
    match = TAG_REGEX.exec(html)
  }

  if (activeTag) {
    activeText += html.slice(lastIndex)
  }

  finalizeA()
  finalizeH3()
  finalizeDd()

  return { entries }
}
