import { nanoid } from 'nanoid'

/**
 * Generate a prefixed ID using nanoid
 * @param prefix - ID prefix (e.g., 'item', 'job')
 * @returns ID in format `{prefix}_{nanoid}`, e.g., 'item_V1StGXR8_Z5jdHi6'
 */
export function generateId(prefix: string): string {
  return `${prefix}_${nanoid(16)}`
}
