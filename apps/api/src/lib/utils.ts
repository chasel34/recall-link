import { nanoid } from 'nanoid'

/**
 * Generate a prefixed ID using nanoid
 * @param prefix - ID prefix (e.g., 'item', 'job')
 * @returns ID in format `{prefix}_{nanoid}`, e.g., 'item_V1StGXR8_Z5jdHi6'
 */
export function generateId(prefix: string): string {
  return `${prefix}_${nanoid(16)}`
}

/**
 * Common tracking parameters to remove from URLs
 */
const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
  'ref',
  'source',
  'campaign',
  '_ga',
  '_gl',
  '_hsenc',
  '_hsmi',
  'hsCtaTracking',
  'hsCtaTracking',
])

/**
 * Normalize URL for deduplication
 * - Upgrade http to https
 * - Lowercase hostname
 * - Remove trailing slash
 * - Remove tracking parameters (utm_*, fbclid, etc.)
 * - Preserve meaningful parameters (id, q, page, v, etc.)
 */
export function normalizeUrl(url: string): string {
  const parsed = new URL(url)

  if (parsed.protocol === 'http:') {
    parsed.protocol = 'https:'
  }

  parsed.hostname = parsed.hostname.toLowerCase()

  const params = new URLSearchParams(parsed.search)
  const filteredParams = new URLSearchParams()

  for (const [key, value] of params.entries()) {
    if (!TRACKING_PARAMS.has(key)) {
      filteredParams.append(key, value)
    }
  }

  parsed.search = filteredParams.toString()

  if (parsed.pathname.endsWith('/') && parsed.pathname !== '/') {
    parsed.pathname = parsed.pathname.slice(0, -1)
  }

  let normalized = parsed.toString()

  if (parsed.pathname === '/' && !parsed.search) {
    normalized = normalized.replace(/\/$/, '')
  }

  return normalized
}
