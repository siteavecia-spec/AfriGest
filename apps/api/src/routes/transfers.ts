import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorization'
import { getTenantClientFromReq } from '../db'
import { transfers, type Transfer, type TransferItem, upsertStock, stockKey } from '../stores/memory'
import { auditReq } from '../services/audit'
import { notifyEvent } from '../services/notify'

const router = Router()

// GET /transfers
router.get('/', requireAuth, requirePermission('stock', 'read'), async (req, res) => {
  const rows = transfers.slice().reverse()
  try { await auditReq(req, { userId: (req as any).auth?.sub, action: 'transfers.read', resource: 'transfers', meta: { count: rows.length } }) } catch {}
  return res.json(rows)
})

// POST /transfers — create transfer draft
const createSchema = z.object({
  sourceBoutiqueId: z.string().min(1),
  destBoutiqueId: z.string().min(1),
  reference: z.string().optional(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive() })).min(1)
})

router.post('/', requireAuth, requirePermission('stock', 'create'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  const id = 'tr-' + Date.now()
  const token = id + '-' + Math.floor(Math.random() * 1e6)
  const t: Transfer = {
    id,
    sourceBoutiqueId: parsed.data.sourceBoutiqueId,
    destBoutiqueId: parsed.data.destBoutiqueId,
    reference: parsed.data.reference,
    items: parsed.data.items as TransferItem[],
    status: 'created',
    token,
    createdAt: new Date().toISOString(),
  }
  transfers.push(t)
  try { await auditReq(req, { userId: (req as any).auth?.sub, action: 'transfers.create', resource: t.id, meta: { source: t.sourceBoutiqueId, dest: t.destBoutiqueId, items: t.items.length } }) } catch {}
  return res.status(201).json({ id: t.id, status: t.status, token: t.token })
})

// POST /transfers/:id/send — mark in_transit and decrement source stock
router.post('/:id/send', requireAuth, requirePermission('stock', 'update'), async (req, res) => {
  const { id } = req.params as { id: string }
  const t = transfers.find(x => x.id === id)
  if (!t) return res.status(404).json({ error: 'Not found' })
  if (t.status !== 'created') return res.status(400).json({ error: 'Invalid status' })
  const prisma: any = getTenantClientFromReq(req)
  try {
    if (prisma?.stock) {
      await prisma.$transaction(async (tx: any) => {
        for (const it of t.items) {
          const existing = await tx.stock.findUnique({ where: { boutiqueId_productId: { boutiqueId: t.sourceBoutiqueId, productId: it.productId } } })
          const qty = Number(existing?.quantity || 0)
          if (qty < it.quantity) throw new Error('Insufficient stock at source')
          await tx.stock.update({ where: { boutiqueId_productId: { boutiqueId: t.sourceBoutiqueId, productId: it.productId } }, data: { quantity: (qty - it.quantity) as any } })
        }
      })
    } else {
      for (const it of t.items) upsertStock(t.sourceBoutiqueId, it.productId, -it.quantity)
    }
    t.status = 'in_transit'
    t.sentAt = new Date().toISOString()
    try { await notifyEvent('[AfriGest] Transfert envoyé', `Transfert ${t.id} envoyé: ${t.sourceBoutiqueId} -> ${t.destBoutiqueId}\nRef: ${t.reference || '-'}\nItems: ${t.items.map(i=>i.productId+':'+i.quantity).join(', ')}`) } catch {}
    try { await auditReq(req, { userId: (req as any).auth?.sub, action: 'transfers.send', resource: t.id }) } catch {}
    return res.json({ ok: true, id: t.id, status: t.status })
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'Failed to send transfer' })
  }
})

// POST /transfers/:id/receive — increment destination stock
router.post('/:id/receive', requireAuth, requirePermission('stock', 'update'), async (req, res) => {
  const { id } = req.params as { id: string }
  const t = transfers.find(x => x.id === id)
  if (!t) return res.status(404).json({ error: 'Not found' })
  if (t.status !== 'in_transit') return res.status(400).json({ error: 'Invalid status' })
  const prisma: any = getTenantClientFromReq(req)
  try {
    if (prisma?.stock) {
      await prisma.$transaction(async (tx: any) => {
        for (const it of t.items) {
          const existing = await tx.stock.findUnique({ where: { boutiqueId_productId: { boutiqueId: t.destBoutiqueId, productId: it.productId } } })
          if (existing) await tx.stock.update({ where: { boutiqueId_productId: { boutiqueId: t.destBoutiqueId, productId: it.productId } }, data: { quantity: (Number(existing.quantity) + it.quantity) as any } })
          else await tx.stock.create({ data: { boutiqueId: t.destBoutiqueId, productId: it.productId, quantity: it.quantity as any } })
        }
      })
    } else {
      for (const it of t.items) upsertStock(t.destBoutiqueId, it.productId, it.quantity)
    }
    t.status = 'received'
    t.receivedAt = new Date().toISOString()
    try { await notifyEvent('[AfriGest] Transfert reçu', `Transfert ${t.id} reçu par ${t.destBoutiqueId}\nRef: ${t.reference || '-'}\nItems: ${t.items.map(i=>i.productId+':'+i.quantity).join(', ')}`) } catch {}
    try { await auditReq(req, { userId: (req as any).auth?.sub, action: 'transfers.receive', resource: t.id }) } catch {}
    return res.json({ ok: true, id: t.id, status: t.status })
  } catch (e: any) {
    return res.status(400).json({ error: e?.message || 'Failed to receive transfer' })
  }
})

export default router
