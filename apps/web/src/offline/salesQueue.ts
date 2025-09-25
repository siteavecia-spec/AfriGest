import { openDB } from 'idb'
import { createSale, API_URL } from '../api/client_clean'

const DB_NAME = 'afrigest_offline'
const STORE_SALES = 'pending_sales'
const LS_SYNC_ERRORS = 'afrigest_sync_errors'

type PendingSale = {
  offlineId: string
  // original payload expected by createSale
  boutiqueId: string
  items: Array<{ productId: string; quantity: number; unitPrice: number; discount?: number }>
  paymentMethod: string
  currency?: string
  // offline metadata
  createdAt?: string
  attempts?: number
  nextAttemptAt?: string
}

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_SALES)) {
        db.createObjectStore(STORE_SALES, { keyPath: 'offlineId' })
      }
    }
  })
}

export async function enqueueSale(sale: any) {
  const db = await getDB()
  const now = new Date().toISOString()
  const record: PendingSale = { ...sale, createdAt: sale.createdAt || now, attempts: sale.attempts || 0, nextAttemptAt: sale.nextAttemptAt || now }
  await db.put(STORE_SALES, record)
}

export async function getPendingSales(): Promise<PendingSale[]> {
  const db = await getDB()
  return db.getAll(STORE_SALES) as Promise<PendingSale[]>
}

export async function removePendingSale(offlineId: string) {
  const db = await getDB()
  await db.delete(STORE_SALES, offlineId)
}

export async function trySyncSales() {
  const sales = await getPendingSales()
  const now = Date.now()
  for (const s of sales) {
    // Skip if scheduled for later
    const next = s.nextAttemptAt ? Date.parse(s.nextAttemptAt) : 0
    if (next > now) continue
    try {
      await tryCreateSaleWithRefresh(s)
      await removePendingSale(s.offlineId)
    } catch (e) {
      // remain in queue with backoff
      const attempts = (s.attempts || 0) + 1
      const delayMs = Math.min(30000, 1000 * Math.pow(2, Math.min(attempts, 5))) // 1s,2s,4s,8s,16s, cap 30s
      const nextAttemptAt = new Date(Date.now() + delayMs).toISOString()
      await updatePendingSaleMeta(s.offlineId, { attempts, nextAttemptAt })
      try {
        const list = JSON.parse(localStorage.getItem(LS_SYNC_ERRORS) || '[]')
        list.push({
          offlineId: s.offlineId,
          error: (e as any)?.message || String(e),
          at: new Date().toISOString()
        })
        localStorage.setItem(LS_SYNC_ERRORS, JSON.stringify(list))
      } catch {}
    }
  }
}

async function updatePendingSaleMeta(offlineId: string, meta: Partial<Pick<PendingSale, 'attempts' | 'nextAttemptAt'>>) {
  const db = await getDB()
  const current = (await db.get(STORE_SALES, offlineId)) as PendingSale | undefined
  if (!current) return
  await db.put(STORE_SALES, { ...current, ...meta })
}

async function tryCreateSaleWithRefresh(sale: PendingSale) {
  try {
    await createSale(sale)
    return
  } catch (e: any) {
    // If unauthorized, attempt refresh then retry once
    if (String(e?.message || '').includes('401') || String(e).includes('401')) {
      await refreshAccessToken()
      await createSale(sale)
      return
    }
    // Some fetch implementations throw without status; perform manual refresh on token presence
    if (!navigator.onLine) throw e
    // As a best-effort, try refresh path then retry once
    try { await refreshAccessToken(); await createSale(sale); return } catch {}
    throw e
  }
}

async function refreshAccessToken() {
  const refresh = localStorage.getItem('afrigest_refresh')
  const company = localStorage.getItem('afrigest_company')
  if (!refresh) throw new Error('No refresh token')
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(company ? { 'x-company': company } : {}) },
    body: JSON.stringify({ refreshToken: refresh })
  })
  if (!res.ok) throw new Error('Failed to refresh token')
  const json = await res.json() as { accessToken: string; refreshToken: string }
  localStorage.setItem('afrigest_token', json.accessToken)
  localStorage.setItem('afrigest_refresh', json.refreshToken)
}

export function setupOfflineSync() {
  // Try once on load
  trySyncSales()
  // Retry when the app regains connectivity
  window.addEventListener('online', () => {
    trySyncSales()
  })
}

export function getSyncErrors(): Array<{ offlineId: string; error: string; at: string }> {
  try {
    return JSON.parse(localStorage.getItem(LS_SYNC_ERRORS) || '[]')
  } catch {
    return []
  }
}

export function clearSyncErrors() {
  try { localStorage.removeItem(LS_SYNC_ERRORS) } catch {}
}
