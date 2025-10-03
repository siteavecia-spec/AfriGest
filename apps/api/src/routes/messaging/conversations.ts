import { Router } from 'express'
import { requireAuth } from '../../middleware/auth'
import { requirePermission } from '../../middleware/authorization'
import { getTenantClientFromReq } from '../../db'
import { listConversations } from '../../services/messaging/conversationService'

const router = Router({ mergeParams: true })

// GET /api/tenants/:tenantId/messaging/conversations
router.get('/', requireAuth, requirePermission('messaging', 'read'), async (req, res) => {
  const { tenantId } = req.params as { tenantId: string }
  const auth = (req as any).auth as { sub: string }
  const prisma = getTenantClientFromReq(req)
  if (!prisma) return res.status(500).json({ error: 'Tenant DB not available' })
  try {
    const items = await listConversations(prisma as any, tenantId, auth.sub)
    return res.json({ items, tenantId })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to list conversations' })
  }
})

export default router
