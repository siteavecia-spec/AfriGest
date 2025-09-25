import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { suppliers, Supplier } from '../stores/memory'

const router = Router()

router.get('/', requireAuth, (req, res) => {
  res.json(suppliers)
})

const createSchema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional()
})

router.post('/', requireAuth, requireRole('super_admin', 'pdg', 'dg'), (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  const id = `sup-${Date.now()}`
  const supplier: Supplier = { id, ...parsed.data }
  suppliers.push(supplier)
  res.status(201).json(supplier)
})

// Update supplier
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional()
})

router.put('/:id', requireAuth, requireRole('super_admin', 'pdg', 'dg'), (req, res) => {
  const { id } = req.params
  const s = suppliers.find(x => x.id === id)
  if (!s) return res.status(404).json({ error: 'Supplier not found' })
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  Object.assign(s, parsed.data)
  return res.json(s)
})

// Delete supplier
router.delete('/:id', requireAuth, requireRole('super_admin', 'pdg', 'dg'), (req, res) => {
  const { id } = req.params
  const idx = suppliers.findIndex(x => x.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Supplier not found' })
  suppliers.splice(idx, 1)
  return res.status(204).send()
})

export default router
