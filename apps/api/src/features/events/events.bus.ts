import type { Database } from 'better-sqlite3'
import { getItemById } from '../items/items.db.js'
import { getItemTags } from '../tags/tags.db.js'

export type EventsEnvelope<TType extends string, TData> = {
  v: 1
  ts: string
  type: TType
  data: TData
}

export type ItemUpdatedSource = 'fetch' | 'ai' | 'system'

export type ItemUpdatedEvent = EventsEnvelope<
  'item.updated',
  {
    item: Record<string, unknown> & { id: string; tags: string[] }
    source: ItemUpdatedSource
  }
>

export type AnyEvent = ItemUpdatedEvent | EventsEnvelope<'ping', { ok: true }>

type Subscriber = (event: AnyEvent) => void

const subscribers = new Set<Subscriber>()

export function subscribeEvents(subscriber: Subscriber): () => void {
  subscribers.add(subscriber)
  return () => {
    subscribers.delete(subscriber)
  }
}

export function publishEvent(event: AnyEvent): void {
  for (const subscriber of subscribers) {
    subscriber(event)
  }
}

export function publishPing(): void {
  publishEvent({ v: 1, ts: new Date().toISOString(), type: 'ping', data: { ok: true } })
}

export function publishItemUpdated(db: Database, itemId: string, source: ItemUpdatedSource): void {
  const item = getItemById(db, itemId)
  if (!item) return

  const tags = getItemTags(db, itemId)

  publishEvent({
    v: 1,
    ts: new Date().toISOString(),
    type: 'item.updated',
    data: {
      item: {
        ...item,
        tags,
      },
      source,
    },
  })
}
