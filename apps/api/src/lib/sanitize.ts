import { JSDOM } from 'jsdom'

type AllowedAttrMap = Record<string, Set<string>>

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

  // Drop known-dangerous / unsupported tags entirely
  if (DROP_TAGS.has(tag)) {
    el.remove()
    return
  }

  // For unknown tags, unwrap to keep text/children
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

  // Strip all attributes except allowlist
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

/**
 * Sanitize Readability's `article.content` HTML for safe rendering.
 * - Strict tag/attr allowlist
 * - Drops images (first iteration)
 * - Normalizes relative links to absolute https? URLs
 */
export function sanitizeReadabilityHtml(html: string, baseUrl: string): string {
  return sanitizeReadabilityHtmlInWindow(html, baseUrl, sharedDom.window)
}

/**
 * Same sanitizer, but reuses an existing DOM window/document.
 * Useful when callers already created a JSDOM instance (e.g. Readability parsing).
 */
export function sanitizeReadabilityHtmlInWindow(html: string, baseUrl: string, window: Window): string {
  const { document } = window

  const container = document.createElement('div')
  container.innerHTML = html

  const walker = document.createTreeWalker(container, window.NodeFilter.SHOW_ELEMENT)
  const elements: Element[] = []

  let current = walker.nextNode() as Element | null
  while (current) {
    elements.push(current)
    current = walker.nextNode() as Element | null
  }

  // Iterate in DOM order; removals/unwraps are safe because we operate on a snapshot.
  for (const el of elements) {
    sanitizeElement(el, baseUrl)
  }

  return container.innerHTML
}
