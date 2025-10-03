import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorization'
import { restockRequests } from '../stores/memory'
import { notifyEvent } from '../services/notify'
import { auditReq } from '../services/audit'

const router = Router()

// GET /restock
router.get('/', requireAuth, requirePermission('purchase_orders', 'read'), async (req, res) => {
  const rows = restockRequests.slice().reverse()
  try { await auditReq(req, { userId: (req as any).auth?.sub, action: 'restock.read', resource: 'restock', meta: { count: rows.length } }) } catch {}
  return res.json(rows)
})

// POST /restock
const createSchema = z.object({ boutiqueId: z.string().min(1), productId: z.string().min(1), quantity: z.number().int().positive() })
router.post('/', requireAuth, requirePermission('purchase_orders', 'create'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  const id = 'rr-' + Date.now()
  const row = { id, ...parsed.data, status: 'pending' as const, createdAt: new Date().toISOString() }
  restockRequests.push(row as any)
  try { await notifyEvent('[AfriGest] Demande de réappro', `Demande ${row.id} — Boutique: ${row.boutiqueId} — Produit: ${row.productId} — Qté: ${row.quantity}`) } catch {}
  try { await auditReq(req, { userId: (req as any).auth?.sub, action: 'restock.create', resource: row.id, meta: { boutiqueId: row.boutiqueId, productId: row.productId, quantity: row.quantity } }) } catch {}
  return res.status(201).json({ id, status: row.status })
})

export default router

// PATCH /restock/:id/approve
router.patch('/:id/approve', requireAuth, requirePermission('purchase_orders', 'status_change'), async (req, res) => {
  const { id } = req.params as { id: string }
  const row = restockRequests.find(r => r.id === id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  if (row.status !== 'pending') return res.status(400).json({ error: 'Not pending' })
  row.status = 'approved' as any
  try { await notifyEvent('[AfriGest] Réappro approuvé', `Demande ${row.id} approuvée — Boutique: ${row.boutiqueId} — Produit: ${row.productId} — Qté: ${row.quantity}`) } catch {}
  try { await auditReq(req, { userId: (req as any).auth?.sub, action: 'restock.approve', resource: row.id }) } catch {}
  return res.json({ id: row.id, status: row.status })
})

// PATCH /restock/:id/reject
router.patch('/:id/reject', requireAuth, requirePermission('purchase_orders', 'status_change'), async (req, res) => {
  const { id } = req.params as { id: string }
  const row = restockRequests.find(r => r.id === id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  if (row.status !== 'pending') return res.status(400).json({ error: 'Not pending' })
  row.status = 'rejected' as any
  try { await notifyEvent('[AfriGest] Réappro rejeté', `Demande ${row.id} rejetée — Boutique: ${row.boutiqueId} — Produit: ${row.productId} — Qté: ${row.quantity}`) } catch {}
  try { await auditReq(req, { userId: (req as any).auth?.sub, action: 'restock.reject', resource: row.id }) } catch {}
  return res.json({ id: row.id, status: row.status })
})

// PATCH /restock/:id/fulfill
router.patch('/:id/fulfill', requireAuth, requirePermission('purchase_orders', 'status_change'), async (req, res) => {
  const { id } = req.params as { id: string }
  const row = restockRequests.find(r => r.id === id)
  if (!row) return res.status(404).json({ error: 'Not found' })
  if (row.status !== 'approved') return res.status(400).json({ error: 'Must be approved first' })
  row.status = 'fulfilled' as any
  try { await notifyEvent('[AfriGest] Réappro livré', `Demande ${row.id} livrée — Boutique: ${row.boutiqueId} — Produit: ${row.productId} — Qté: ${row.quantity}`) } catch {}
  try { await auditReq(req, { userId: (req as any).auth?.sub, action: 'restock.fulfill', resource: row.id }) } catch {}
  return res.json({ id: row.id, status: row.status })
})
