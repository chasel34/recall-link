import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'

type AllowedAttrMap = Record<string, Set<string>>

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (compatible; RecallBot/1.0)'
const DEFAULT_TIMEOUT_MS = 30000

const ALLOWED_TAGS = new Set([
  'a',
  'article',
  'aside',
  'blockquote',
  'br',
  'code',
  'dd',
  'div',
  'dl',
  'dt',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'i',
  'kbd',
  'li',
  'main',
  'ol',
  'p',
  'pre',
  'section',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
])

const DROP_TAGS = new Set([
  'audio',
  'button',
  'canvas',
  'embed',
  'form',
  'iframe',
  'img',
  'input',
  'link',
  'meta',
  'noscript',
  'object',
  'option',
  'script',
  'select',
  'style',
  'svg',
  'textarea',
  'video',
])

const ALLOWED_ATTRS: AllowedAttrMap = {
  a: new Set(['href', 'title']),
}

const sharedDom = new JSDOM(`<!doctype html><body></body>`)

export type FetchHtmlOptions = {
  userAgent?: string
  timeoutMs?: number
  signal?: AbortSignal
}

export type ExtractedContent = {
  title?: string
  clean_text?: string
  clean_html?: string
}

function isSafeUrl(url: URL): boolean {
  return url.protocol === 'http:' || url.protocol === 'https:'
}

function sanitizeLinkHref(rawHref: string, baseUrl: string): string | null {
  try {
    const url = new URL(rawHref, baseUrl)
    if (!isSafeUrl(url)) return null
    return url.toString()
  } catch {
    return null
  }
}

function sanitizeElement(el: Element, baseUrl: string): void {
  const tag = el.tagName.toLowerCase()

  if (DROP_TAGS.has(tag)) {
    el.remove()
    return
  }

  if (!ALLOWED_TAGS.has(tag)) {
    const parent = el.parentNode
    if (!parent) {
      el.remove()
      return
    }

    while (el.firstChild) {
      parent.insertBefore(el.firstChild, el)
    }
    el.remove()
    return
  }

  const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>()
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase()
    if (name.startsWith('on') || name === 'style') {
      el.removeAttribute(attr.name)
      continue
    }

    if (!allowed.has(name)) {
      el.removeAttribute(attr.name)
    }
  }

  if (tag === 'a') {
    const href = el.getAttribute('href')
    if (href) {
      const sanitized = sanitizeLinkHref(href, baseUrl)
      if (!sanitized) {
        el.removeAttribute('href')
      } else {
        el.setAttribute('href', sanitized)
        el.setAttribute('rel', 'noopener noreferrer')
        el.setAttribute('target', '_blank')
      }
    }
  }
}

function getFetchSignal(options?: FetchHtmlOptions): AbortSignal {
  if (options?.signal) return options.signal
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  return AbortSignal.timeout(timeoutMs)
}

export function sanitizeReadabilityHtml(html: string, baseUrl: string): string {
  return sanitizeReadabilityHtmlInWindow(html, baseUrl, sharedDom.window as unknown as Window)
}

export function sanitizeReadabilityHtmlInWindow(
  html: string,
  baseUrl: string,
  window: Window
): string {
  const { document } = window

  const container = document.createElement('div')
  container.innerHTML = html

  const walker = document.createTreeWalker(container, (window as any).NodeFilter.SHOW_ELEMENT)
  const elements: Element[] = []

  let current = walker.nextNode() as Element | null
  while (current) {
    elements.push(current)
    current = walker.nextNode() as Element | null
  }

  for (const el of elements) {
    sanitizeElement(el, baseUrl)
  }

  return container.innerHTML
}

export async function fetchHtml(url: string, options?: FetchHtmlOptions): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': options?.userAgent ?? DEFAULT_USER_AGENT,
    },
    redirect: 'follow',
    signal: getFetchSignal(options),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return response.text()
}

export function extractReadable(html: string, url: string): ExtractedContent {
  const dom = new JSDOM(html, { url })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()

  if (!article) {
    throw new Error('Failed to extract article content')
  }

  const cleanHtml = article.content
    ? sanitizeReadabilityHtmlInWindow(article.content, url, dom.window as unknown as Window)
    : undefined

  return {
    title: article.title || undefined,
    clean_text: article.textContent ?? undefined,
    clean_html: cleanHtml,
  }
}

export async function fetchAndExtract(
  url: string,
  options?: FetchHtmlOptions
): Promise<ExtractedContent> {
  const html = await fetchHtml(url, options)
  return extractReadable(html, url)
}
