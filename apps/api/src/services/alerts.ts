import { Request } from 'express'
import { getTenantClientFromReq } from '../db'
import { products as memoryProducts } from '../stores/memory'

export interface AlertItem { id: string; sku: string; name: string; sector?: string | null; reason: string; date?: string }
export interface AlertsPayload {
  expired: AlertItem[]
  expiringSoon: AlertItem[]
  warrantyExpiring: AlertItem[]
}

function parseDate(v: any): Date | null {
  if (!v) return null
  try { return new Date(v) } catch { return null }
}

export async function computeAlerts(req: Request, params?: { days?: number; sector?: string }) : Promise<AlertsPayload> {
  const now = new Date()
  const soonDays = Math.max(1, Math.min(365, Number(params?.days ?? 30)))
  const sectorFilter = (params?.sector || '').trim()

  let items: Array<{ id: string; sku: string; name: string; sector?: string | null; attrs?: any }> = []
  const prisma: any = getTenantClientFromReq(req)
  if (prisma?.product) {
    try {
      items = await prisma.product.findMany({ select: { id: true, sku: true, name: true, sector: true, attrs: true } })
    } catch {
      items = memoryProducts as any
    }
  } else {
    items = memoryProducts as any
  }
  if (sectorFilter && sectorFilter !== 'all') items = items.filter(p => (p.sector || 'generic') === sectorFilter)

  const expired: AlertItem[] = []
  const expiringSoon: AlertItem[] = []
  const warrantyExpiring: AlertItem[] = []

  for (const p of items) {
    const a = p.attrs || {}
    // Expiry-based alerts (pharmacy, grocery, beauty cosmetics)
    const expiry = parseDate(a.expiry)
    if (expiry) {
      const diffDays = Math.floor((expiry.getTime() - now.getTime()) / (1000*60*60*24))
      if (diffDays < 0) {
        expired.push({ id: p.id, sku: p.sku, name: p.name, sector: p.sector, reason: 'Produit expiré', date: expiry.toISOString() })
      } else if (diffDays <= soonDays) {
        expiringSoon.push({ id: p.id, sku: p.sku, name: p.name, sector: p.sector, reason: `Expire dans ${diffDays}j`, date: expiry.toISOString() })
      }
    }
    // Warranty-based alerts (electronics)
    const warrantyMonths = Number.isFinite(Number(a.warranty)) ? Number(a.warranty) : null
    const purchaseDate = parseDate(a.purchaseDate || a.purchasedAt)
    if (warrantyMonths && purchaseDate) {
      const end = new Date(purchaseDate)
      end.setMonth(end.getMonth() + warrantyMonths)
      const diffDays = Math.floor((end.getTime() - now.getTime()) / (1000*60*60*24))
      if (diffDays >= 0 && diffDays <= soonDays) {
        warrantyExpiring.push({ id: p.id, sku: p.sku, name: p.name, sector: p.sector, reason: `Garantie expire dans ${diffDays}j`, date: end.toISOString() })
      }
    }
  }

  // Sort by nearest date ascending
  const byDateAsc = (x: AlertItem, y: AlertItem) => (new Date(x.date || 0).getTime() - new Date(y.date || 0).getTime())
  expired.sort(byDateAsc)
  expiringSoon.sort(byDateAsc)
  warrantyExpiring.sort(byDateAsc)

  return { expired, expiringSoon, warrantyExpiring }
}
