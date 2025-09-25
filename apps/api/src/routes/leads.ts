import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { requireRole } from '../middleware/rbac'
import { demoRequests } from '../stores/memory'
import { z } from 'zod'

const router = Router()

// List demo requests (leads) - Super Admin only (MVP)
router.get('/', requireAuth, requireRole('super_admin'), (_req, res) => {
  // Most recent first
  const rows = [...demoRequests].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  res.json(rows)
})

export default router

const patchSchema = z.object({
  contacted: z.boolean().optional(),
  notes: z.string().optional()
})

// Update a lead
router.patch('/:id', requireAuth, requireRole('super_admin'), (req, res) => {
  const { id } = req.params
  const idx = demoRequests.findIndex(d => d.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Lead not found' })
  const parsed = patchSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  const prev = demoRequests[idx]
  const next = { ...prev, ...parsed.data } as typeof prev
  // Timestamps
  next.updatedAt = new Date().toISOString()
  const operator = (req.headers['x-user-name'] || '').toString().trim() || 'Operator'
  next.updatedBy = operator
  if (typeof parsed.data.contacted === 'boolean') {
    if (parsed.data.contacted && !prev.contacted) next.contactedAt = new Date().toISOString()
    if (!parsed.data.contacted) next.contactedAt = undefined
  }
  demoRequests[idx] = next
  return res.json(demoRequests[idx])
})
