import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { requirePermission } from '../middleware/authorization'
import type { Supplier } from '../stores/memory'
import { suppliers as memorySuppliers } from '../stores/memory'
import { getTenantClientFromReq } from '../db'
import * as svc from '../services/suppliers'

const router = Router()

router.get('/', requireAuth, requirePermission('suppliers', 'read'), async (req, res) => {
  const limitRaw = (req.query.limit || '').toString()
  const offsetRaw = (req.query.offset || '').toString()
  const limit = limitRaw ? Math.max(1, Math.min(200, Number(limitRaw))) : undefined
  const offset = offsetRaw ? Math.max(0, Number(offsetRaw)) : undefined
  const rows = await svc.listSuppliers(req, { limit, offset })
  try {
    const prisma = getTenantClientFromReq(req)
    if (prisma) {
      const total = await (prisma as any).supplier.count()
      res.setHeader('X-Total-Count', String(total))
    } else {
      res.setHeader('X-Total-Count', String(memorySuppliers.length))
    }
  } catch {
    res.setHeader('X-Total-Count', String(memorySuppliers.length))
  }
  res.json(rows)
})

const createSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional()
})

router.post('/', requireAuth, requireRole('super_admin', 'pdg', 'dg'), requirePermission('suppliers', 'create'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  const created = await svc.createSupplier(req, parsed.data as Omit<Supplier, 'id'>)
  res.status(201).json(created)
})

// Update supplier
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional()
})

router.put('/:id', requireAuth, requireRole('super_admin', 'pdg', 'dg'), requirePermission('suppliers', 'update'), async (req, res) => {
  const { id } = req.params
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  const updated = await svc.updateSupplier(req, id, parsed.data)
  if (!updated) return res.status(404).json({ error: 'Supplier not found' })
  return res.json(updated)
})

// Delete supplier
router.delete('/:id', requireAuth, requireRole('super_admin', 'pdg', 'dg'), requirePermission('suppliers', 'delete'), async (req, res) => {
  const { id } = req.params
  const ok = await svc.deleteSupplier(req, id)
  if (!ok) return res.status(404).json({ error: 'Supplier not found' })
  return res.status(204).send()
})

export default router
