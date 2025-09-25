import { Router } from 'express'
import { handleStripeWebhook } from '../../services/ecommerce/paymentService'
import { getTenantClientFromReq } from '../../db'

const router = Router({ mergeParams: true })

// Stripe webhooks (optionnel en Phase 1). Attention: nécessite raw body middleware si vous validez la signature.
router.post('/stripe', async (req, res) => {
  const { tenantId } = req.params as { tenantId: string }
  const prisma = getTenantClientFromReq(req)
  return handleStripeWebhook(req as any, res, prisma, tenantId)
})

export default router
