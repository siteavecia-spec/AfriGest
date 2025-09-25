import { products, upsertStock } from '../../stores/memory'

export type InventoryChange = { sku: string; delta: number; reason?: string }

/**
 * Apply inventory deltas for e-commerce.
 * Phase 1 (in-memory):
 * - Shared stock only (default boutiqueId = 'bq-1')
 * - Maps SKU -> productId from in-memory products
 */
export function applyInventoryDeltas(tenantId: string, changes: InventoryChange[], options?: { boutiqueId?: string }) {
  const boutiqueId = options?.boutiqueId || 'bq-1'
  let applied = 0
  const failed: Array<{ sku: string; error: string }> = []
  for (const ch of changes) {
    const prod = products.find(p => p.sku === ch.sku)
    if (!prod) { failed.push({ sku: ch.sku, error: 'SKU not found' }); continue }
    try {
      upsertStock(boutiqueId, prod.id, ch.delta)
      applied += 1
    } catch (e: any) {
      failed.push({ sku: ch.sku, error: e?.message || 'apply failed' })
    }
  }
  return { applied, failed }
}
