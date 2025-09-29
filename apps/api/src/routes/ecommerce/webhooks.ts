import express, { Router } from 'express'
import { handleStripeWebhook, handlePayPalWebhook, handleMtnWebhook, handleOrangeWebhook } from '../../services/ecommerce/paymentService'
import { getTenantClientFromReq } from '../../db'

const router = Router({ mergeParams: true })

// Stripe webhooks (optionnel en Phase 1). Attention: nécessite raw body middleware si vous validez la signature.
router.post('/stripe', express.raw({ type: '*/*' }), async (req, res) => {
  const { tenantId } = req.params as { tenantId: string }
  const prisma = getTenantClientFromReq(req)
  return handleStripeWebhook(req as any, res, prisma, tenantId)
})

// PayPal webhooks
router.post('/paypal', express.json(), async (req, res) => {
  const { tenantId } = req.params as { tenantId: string }
  const prisma = getTenantClientFromReq(req)
  return handlePayPalWebhook(req as any, res, prisma, tenantId)
})

// MTN MoMo webhooks
router.post('/mtn', express.json(), async (req, res) => {
  const { tenantId } = req.params as { tenantId: string }
  const prisma = getTenantClientFromReq(req)
  return handleMtnWebhook(req as any, res, prisma, tenantId)
})

// Orange MoMo webhooks
router.post('/orange', express.json(), async (req, res) => {
  const { tenantId } = req.params as { tenantId: string }
  const prisma = getTenantClientFromReq(req)
  return handleOrangeWebhook(req as any, res, prisma, tenantId)
})

export default router
