import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { getTenantClientFromReq } from '../db'
import { boutiques as memoryBoutiques } from '../stores/memory'

const router = Router()

// GET /boutiques
router.get('/', requireAuth, async (req, res) => {
  const prisma: any = getTenantClientFromReq(req)
  if (prisma?.boutique) {
    try {
      const rows = await prisma.boutique.findMany({ orderBy: { name: 'asc' } })
      return res.json(rows)
    } catch {}
  }
  return res.json(memoryBoutiques)
})

// POST /boutiques
const createSchema = z.object({ name: z.string().min(1), code: z.string().min(1), address: z.string().optional(), city: z.string().optional(), country: z.string().optional() })
router.post('/', requireAuth, requireRole('super_admin','pdg'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  const prisma: any = getTenantClientFromReq(req)
  if (prisma?.boutique) {
    try {
      const created = await prisma.boutique.create({ data: parsed.data })
      return res.status(201).json(created)
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Failed to create boutique' })
    }
  }
  // memory fallback: push into memory, generate id
  const id = 'bq-' + Date.now()
  const row: any = { id, name: parsed.data.name, code: parsed.data.code, address: parsed.data.address, city: parsed.data.city, country: parsed.data.country }
  ;(memoryBoutiques as any).push(row)
  return res.status(201).json(row)
})

export default router
