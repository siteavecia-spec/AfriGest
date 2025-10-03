import { Router } from 'express'
import { requireAuth } from '../../middleware/auth'
import { requirePermission } from '../../middleware/authorization'
import { getTenantClientFromReq } from '../../db'

const router = Router({ mergeParams: true })

// GET /api/tenants/:tenantId/messaging/conversation/:userId
// Returns recent messages (desc) between auth user and :userId
router.get('/:userId', requireAuth, requirePermission('messaging', 'read'), async (req, res) => {
  const { tenantId, userId } = req.params as { tenantId: string; userId: string }
  const auth = (req as any).auth as { sub: string }
  const prisma = getTenantClientFromReq(req)
  if (!prisma) return res.status(500).json({ error: 'Tenant DB not available' })
  try {
    const [a, b] = [auth.sub, userId].sort()
    const convo = await (prisma as any).conversation.findFirst({ where: { tenantId, userOneId: a, userTwoId: b } })
    if (!convo) return res.json({ items: [], conversationId: null, tenantId })
    const limit = Math.min(100, Number((req.query.limit as string) || '50'))
    const before = req.query.before ? new Date(String(req.query.before)) : undefined
    const messages = await (prisma as any).message.findMany({
      where: { conversationId: convo.id, ...(before ? { createdAt: { lt: before } } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
    return res.json({ items: messages, conversationId: convo.id, tenantId })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to fetch conversation' })
  }
})

export default router
