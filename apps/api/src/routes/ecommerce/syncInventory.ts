import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../../middleware/auth'
import { applyInventoryDeltas } from '../../services/ecommerce/stockService'

const router = Router({ mergeParams: true })

// POST /api/tenants/:tenantId/ecommerce/sync-inventory
// Idempotent endpoint to apply stock deltas from storefront or external systems
const payloadSchema = z.object({
  changes: z.array(z.object({ sku: z.string(), delta: z.number().int(), reason: z.string().optional() }))
})

router.post('/', requireAuth, async (req, res) => {
  const parsed = payloadSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const { tenantId } = req.params as { tenantId: string }
  // Phase 1: in-memory shared stock (boutiqueId='bq-1')
  const { applied, failed } = applyInventoryDeltas(tenantId, parsed.data.changes)
  return res.json({ ok: true, tenantId, applied, failed })
})

export default router
