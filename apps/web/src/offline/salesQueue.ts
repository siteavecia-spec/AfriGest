import { openDB } from 'idb'
import { createSale } from '../api/client_clean'

const DB_NAME = 'afrigest_offline'
const STORE_SALES = 'pending_sales'
const LS_SYNC_ERRORS = 'afrigest_sync_errors'

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
  await db.put(STORE_SALES, sale)
}

export async function getPendingSales() {
  const db = await getDB()
  return db.getAll(STORE_SALES)
}

export async function removePendingSale(offlineId: string) {
  const db = await getDB()
  await db.delete(STORE_SALES, offlineId)
}

export async function trySyncSales() {
  const sales = await getPendingSales()
  for (const s of sales) {
    try {
      await createSale(s)
      await removePendingSale(s.offlineId)
    } catch (e) {
      // remain in queue
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
