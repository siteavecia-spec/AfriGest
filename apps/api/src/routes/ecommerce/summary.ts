import { Router } from 'express'
import { requireAuth } from '../../middleware/auth'
import { getTodayOnlineKPIs } from '../../services/ecommerce/orderService'
import { getTenantClientFromReq } from '../../db'

const router = Router({ mergeParams: true })

// GET /api/tenants/:tenantId/ecommerce/summary
// Basic placeholders for KPIs until real analytics are implemented
router.get('/', requireAuth, async (req, res) => {
  const { tenantId } = req.params as { tenantId: string }
  const prisma = getTenantClientFromReq(req)
  const { onlineCount, onlineRevenue, paidCount, averageOrderValuePaid } = await getTodayOnlineKPIs(tenantId, prisma)
  // MVP: conversionRate placeholder (to be replaced with real analytics)
  const conversionRate = 0
  return res.json({ tenantId, today: { onlineCount, onlineRevenue, paidCount, averageOrderValuePaid, conversionRate } })
})

export default router
