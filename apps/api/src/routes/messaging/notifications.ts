import { Router } from 'express'
import { requireAuth } from '../../middleware/auth'
import { getTenantClientFromReq } from '../../db'

const router = Router({ mergeParams: true })

// GET /api/tenants/:tenantId/notifications
router.get('/', requireAuth, async (req, res) => {
  const { tenantId } = req.params as { tenantId: string }
  const auth = (req as any).auth as { sub: string }
  const prisma = getTenantClientFromReq(req)
  if (!prisma) return res.status(500).json({ error: 'Tenant DB not available' })
  try {
    const items = await (prisma as any).notification.findMany({
      where: { userId: auth.sub },
      orderBy: [ { status: 'asc' }, { createdAt: 'desc' } ],
      take: 200
    })
    return res.json({ items, tenantId })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to list notifications' })
  }
})

// PUT /api/tenants/:tenantId/notifications/:notificationId/read
router.put('/:notificationId/read', requireAuth, async (req, res) => {
  const { notificationId } = req.params as { notificationId: string }
  const prisma = getTenantClientFromReq(req)
  if (!prisma) return res.status(500).json({ error: 'Tenant DB not available' })
  try {
    await (prisma as any).notification.update({ where: { id: notificationId }, data: { status: 'read' } })
    return res.json({ ok: true })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to mark as read' })
  }
})

export default router
