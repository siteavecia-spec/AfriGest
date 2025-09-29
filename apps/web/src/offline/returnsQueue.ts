import { openDB } from 'idb'
import { API_URL } from '../api/client_clean'

const DB_NAME = 'afrigest_offline'
const STORE_RETURNS = 'pending_returns'
const LS_SYNC_ERRORS = 'afrigest_sync_errors'

export type PendingReturn = {
  offlineId: string
  type: 'customer' | 'supplier'
  boutiqueId: string
  reference?: string
  items: Array<{ productId: string; quantity: number; reason?: string }>
  createdAt?: string
  attempts?: number
  nextAttemptAt?: string
}

export async function getPendingReturn(offlineId: string): Promise<PendingReturn | undefined> {
  const db = await getDB()
  return (await db.get(STORE_RETURNS, offlineId)) as PendingReturn | undefined
}

export async function retryPendingReturn(offlineId: string) {
  const rec = await getPendingReturn(offlineId)
  if (!rec) return
  try {
    await tryPostReturn(rec)
    await removePendingReturn(offlineId)
  } catch (e) {
    const attempts = (rec.attempts || 0) + 1
    const delayMs = Math.min(30000, 1000 * Math.pow(2, Math.min(attempts, 5)))
    const nextAttemptAt = new Date(Date.now() + delayMs).toISOString()
    await updateMeta(offlineId, { attempts, nextAttemptAt })
    try {
      const list = JSON.parse(localStorage.getItem(LS_SYNC_ERRORS) || '[]')
      list.push({ offlineId, error: (e as any)?.message || String(e), at: new Date().toISOString() })
      localStorage.setItem(LS_SYNC_ERRORS, JSON.stringify(list))
    } catch {}
    throw e
  }
}

async function getDB() {
  return openDB(DB_NAME, 3, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_RETURNS)) {
        db.createObjectStore(STORE_RETURNS, { keyPath: 'offlineId' })
      }
    }
  })
}

export async function enqueueReturn(r: Omit<PendingReturn, 'createdAt' | 'attempts' | 'nextAttemptAt'>) {
  const db = await getDB()
  const now = new Date().toISOString()
  const rec: PendingReturn = { ...r, createdAt: now, attempts: 0, nextAttemptAt: now }
  await db.put(STORE_RETURNS, rec)
}

export async function listPendingReturns(): Promise<PendingReturn[]> {
  const db = await getDB()
  return db.getAll(STORE_RETURNS) as Promise<PendingReturn[]>
}

export async function removePendingReturn(offlineId: string) {
  const db = await getDB()
  await db.delete(STORE_RETURNS, offlineId)
}

async function updateMeta(offlineId: string, meta: Partial<Pick<PendingReturn, 'attempts'|'nextAttemptAt'>>) {
  const db = await getDB()
  const cur = (await db.get(STORE_RETURNS, offlineId)) as PendingReturn | undefined
  if (!cur) return
  await db.put(STORE_RETURNS, { ...cur, ...meta })
}

async function tryPostReturn(r: PendingReturn) {
  const token = localStorage.getItem('afrigest_token')
  const company = localStorage.getItem('afrigest_company')
  const url = r.type === 'customer' ? `${API_URL}/returns/customer` : `${API_URL}/returns/supplier`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(company ? { 'x-company': company } : {}) },
    body: JSON.stringify({ boutiqueId: r.boutiqueId, reference: r.reference, items: r.items })
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function trySyncReturns() {
  const rows = await listPendingReturns()
  const now = Date.now()
  for (const r of rows) {
    const next = r.nextAttemptAt ? Date.parse(r.nextAttemptAt) : 0
    if (next > now) continue
    try {
      await tryPostReturn(r)
      await removePendingReturn(r.offlineId)
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
