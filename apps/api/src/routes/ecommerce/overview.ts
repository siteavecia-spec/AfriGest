import { Router } from 'express'
import { z } from 'zod'
import { getTenantClientFromReq } from '../../db'

const router = Router({ mergeParams: true })

// GET /api/tenants/:tenantId/ecommerce/overview?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', async (req, res) => {
  const schema = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
  const parsed = schema.safeParse({ from: req.query.from, to: req.query.to })
  if (!parsed.success) return res.status(400).json({ error: 'Invalid or missing from/to (YYYY-MM-DD)' })
  const { from, to } = parsed.data
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  const start = new Date(fy, fm - 1, fd).getTime()
  const end = new Date(ty, tm - 1, td).getTime() + 24 * 60 * 60 * 1000
  const prisma: any = getTenantClientFromReq(req)

  try {
    let rows: Array<{ createdAt: string; items: Array<{ sku: string; quantity: number; price: number; currency: string }>; total: number; paymentStatus?: string }>
    if (prisma?.ecommerceOrder) {
      const found = await prisma.ecommerceOrder.findMany({ where: { createdAt: { gte: new Date(start), lt: new Date(end) } }, include: { items: true } })
      rows = (found || []).map((o: any) => ({ createdAt: o.createdAt?.toISOString?.() || o.createdAt, items: (o.items || []).map((it: any) => ({ sku: it.sku, quantity: Number(it.quantity), price: Number(it.price), currency: it.currency })), total: Number(o.total || 0), paymentStatus: o.paymentStatus }))
    } else {
      // In-memory fallback — rely on sales overview if no separate ecommerce store; return empty structure
      rows = []
    }

    const payments: Record<string, number> = {}
    const dailyMap: Record<string, { count: number; revenue: number }> = {}
    const prodMap: Record<string, { quantity: number; revenue: number }> = {}
    let count = 0; let revenue = 0

    rows.forEach(r => {
      count += 1
      revenue += Number(r.total || 0)
      const d = (r.createdAt || '').slice(0, 10)
      const dm = (dailyMap[d] = dailyMap[d] || { count: 0, revenue: 0 })
      dm.count += 1; dm.revenue += Number(r.total || 0)
      ;(r.items || []).forEach(it => {
        const pm = (prodMap[it.sku] = prodMap[it.sku] || { quantity: 0, revenue: 0 })
        pm.quantity += Number(it.quantity)
        pm.revenue += Number(it.price) * Number(it.quantity)
      })
    })

    const dailySeries = Object.entries(dailyMap).sort((a, b) => a[0].localeCompare(b[0])).map(([date, v]) => ({ date, count: v.count, revenue: v.revenue }))
    const topProducts = Object.entries(prodMap).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 50).map(([sku, v]) => ({ sku, quantity: v.quantity, revenue: v.revenue }))

    return res.json({ from, to, periodTotals: { count, revenue, payments }, dailySeries, topProducts })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to compute ecommerce overview' })
  }
})

export default router
