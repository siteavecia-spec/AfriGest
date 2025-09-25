import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../../middleware/auth'
import { getTenantClientFromReq } from '../../db'

const router = Router({ mergeParams: true })

// GET /api/tenants/:tenantId/ecommerce/customers
router.get('/', requireAuth, async (req, res) => {
  const { tenantId } = req.params as { tenantId: string }
  const prisma = getTenantClientFromReq(req)
  if (prisma?.ecommerceCustomer) {
    const items = await prisma.ecommerceCustomer.findMany({ orderBy: { createdAt: 'desc' } })
    return res.json({ items, tenantId })
  }
  return res.json({ items: [], tenantId })
})

// POST /api/tenants/:tenantId/ecommerce/customers
const createSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  addresses: z.array(z.object({ line1: z.string(), city: z.string(), country: z.string().default('GN'), postalCode: z.string().optional() })).optional().default([])
})

router.post('/', requireAuth, async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const { tenantId } = req.params as { tenantId: string }
  const prisma = getTenantClientFromReq(req)
  if (prisma?.ecommerceCustomer) {
    const created = await prisma.ecommerceCustomer.create({ data: { email: parsed.data.email, phone: parsed.data.phone, firstName: parsed.data.firstName, lastName: parsed.data.lastName } })
    return res.status(201).json(created)
  }
  return res.status(501).json({ error: 'Customers not available in in-memory mode', tenantId })
})

export default router
