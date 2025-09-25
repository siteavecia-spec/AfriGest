import { Router } from 'express'
import { requireAuth } from '../../middleware/auth'
import { getPresenceSnapshot } from '../../ws'

const router = Router({ mergeParams: true })

// GET /api/tenants/:tenantId/presence
router.get('/', requireAuth, async (req, res) => {
  const { tenantId } = req.params as { tenantId: string }
  try {
    const items = getPresenceSnapshot(tenantId)
    return res.json({ tenantId, items })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to get presence snapshot' })
  }
})

export default router
