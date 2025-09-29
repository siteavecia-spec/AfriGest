import { openDB } from 'idb'
import { API_URL } from '../api/client_clean'

const DB_NAME = 'afrigest_offline'
const STORE_RX = 'pending_receivings'
const LS_SYNC_ERRORS = 'afrigest_sync_errors'

type PendingReceiving = {
  offlineId: string
  poId: string
  boutiqueId?: string
  note?: string
  items: Array<{ productId: string; received: number }>
  createdAt?: string
  attempts?: number
  nextAttemptAt?: string
}

async function getDB() {
  return openDB(DB_NAME, 2, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(STORE_RX)) {
        db.createObjectStore(STORE_RX, { keyPath: 'offlineId' })
      }
    }
  })
}

export async function enqueueReceiving(rec: Omit<PendingReceiving, 'createdAt' | 'attempts' | 'nextAttemptAt'>) {
  const db = await getDB()
  const now = new Date().toISOString()
  const record: PendingReceiving = { ...rec, createdAt: now, attempts: 0, nextAttemptAt: now }
  await db.put(STORE_RX, record)
}

export async function listPendingReceivings(): Promise<PendingReceiving[]> {
  const db = await getDB()
  return db.getAll(STORE_RX) as Promise<PendingReceiving[]>
}

export async function removePendingReceiving(offlineId: string) {
  const db = await getDB()
  await db.delete(STORE_RX, offlineId)
}

async function updateMeta(offlineId: string, meta: Partial<Pick<PendingReceiving, 'attempts'|'nextAttemptAt'>>) {
  const db = await getDB()
  const cur = (await db.get(STORE_RX, offlineId)) as PendingReceiving | undefined
  if (!cur) return
  await db.put(STORE_RX, { ...cur, ...meta })
}

async function tryPostReceiving(r: PendingReceiving) {
  const token = localStorage.getItem('afrigest_token')
  const company = localStorage.getItem('afrigest_company')
  const res = await fetch(`${API_URL}/purchase-orders/${encodeURIComponent(r.poId)}/receive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(company ? { 'x-company': company } : {}) },
    body: JSON.stringify({ items: r.items, note: r.note, boutiqueId: r.boutiqueId })
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function trySyncReceivings() {
  const list = await listPendingReceivings()
  const now = Date.now()
  for (const r of list) {
    const next = r.nextAttemptAt ? Date.parse(r.nextAttemptAt) : 0
    if (next > now) continue
    try {
      await tryPostReceiving(r)
      await removePendingReceiving(r.offlineId)
    } catch (e) {
      const attempts = (r.attempts || 0) + 1
      const delayMs = Math.min(30000, 1000 * Math.pow(2, Math.min(attempts, 5)))
      const nextAttemptAt = new Date(Date.now() + delayMs).toISOString()
      await updateMeta(r.offlineId, { attempts, nextAttemptAt })
      try {
        const list = JSON.parse(localStorage.getItem(LS_SYNC_ERRORS) || '[]')
        list.push({ offlineId: r.offlineId, error: (e as any)?.message || String(e), at: new Date().toISOString() })
        localStorage.setItem(LS_SYNC_ERRORS, JSON.stringify(list))
      } catch {}
    }
  }
}
