import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorization'
import { getMasterPrisma } from '../db/master'
import { pushAudit } from '../stores/audit'
import { signAccessToken } from '../services/tokens'

const router = Router()

// In-memory fallback when Master Prisma is not available (dev/demo without Postgres)
type MemCompany = { id: string; code: string; name: string; contactEmail?: string; status: 'active'|'pending'|'archived'; createdAt: string; subdomain?: string|null; plan?: string }
const mem: { companies: MemCompany[]; audit: Array<{ actorEmail?: string; action: string; companyCode?: string; at: string }> } = {
  companies: [],
  audit: []
}
function uuid() { return 'c_' + Date.now() + '_' + Math.floor(Math.random() * 1e6) }

// Zod schemas
const createCompanySchema = z.object({
  code: z.string().min(2).max(64),
  name: z.string().min(2).max(200),
  contactEmail: z.string().email().optional(),
  subdomain: z.string().optional(),
  plan: z.string().optional(),
})

// POST /admin/seed/demo-company — ensure demo company exists (master DB or memory)
router.post('/seed/demo-company', requireAuth, requirePermission('admin.companies', 'create'), async (req, res) => {
  const prisma = getMasterPrisma()
  try {
    if (prisma) {
      const code = 'demo'
      let company = await prisma.company.findUnique({ where: { code } })
      if (!company) {
        company = await prisma.company.create({ data: { code, name: 'Demo Company', status: 'active', plan: 'starter' } as any })
      } else if (company.status === 'archived') {
        company = await prisma.company.update({ where: { id: company.id }, data: { status: 'active' } })
      }
      return res.json({ ok: true, company })
    } else {
      const exists = mem.companies.find(c => c.code === 'demo')
      if (!exists) {
        const now = new Date().toISOString()
        const created: MemCompany = { id: uuid(), code: 'demo', name: 'Demo Company', contactEmail: 'admin@demo.local', subdomain: 'demo', plan: 'starter', status: 'active', createdAt: now }
        mem.companies.unshift(created)
        mem.audit.push({ actorEmail: (req as any).user?.email || 'unknown', action: 'company.create(seed)', companyCode: created.code, at: now })
        return res.json({ ok: true, company: created, mem: true })
      }
      return res.json({ ok: true, company: exists, mem: true })
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to seed demo company' })
  }
})

// POST /admin/support-token { userId?, hours?: number, scopes?: string[] }
// Mint a temporary support access token with read-only window enforced by authorization middleware
router.post('/support-token', requireAuth, requirePermission('admin.console', 'update'), async (req, res) => {
  const schema = z.object({ userId: z.string().optional(), hours: z.number().int().positive().max(24).optional(), scopes: z.array(z.string()).optional() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const hours = parsed.data.hours || 4
  const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
  const sub = parsed.data.userId || (req as any).auth?.sub || 'support-user'
  // Create JWT with role support; `support_until` will be injected by clients in headers or via custom signing in a real impl.
  // For MVP, include support_until in token payload by serializing into subject-like metadata is not supported; we keep it in a side header suggestion.
  // Here we just return the token and until; FE should attach until in x-support-until if needed.
  const token = signAccessToken(sub, 'support' as any)
  return res.json({ accessToken: token, role: 'support', support_until: until, scopes: parsed.data.scopes || ['dashboard','reports','audit'] })
})

// POST /admin/companies/:id/provision (simulate provisioning)
router.post('/companies/:id/provision', requireAuth, requirePermission('admin.companies', 'update'), async (req, res) => {
  const prisma = getMasterPrisma()
  const id = String(req.params.id)
  try {
    if (prisma) {
      // For now, simply set status to active; real flow will create DBs/migrate/seed
      const updated = await prisma.company.update({ where: { id }, data: { status: 'active' } })
      return res.json({ ok: true, id: updated.id, status: updated.status })
    } else {
      const idx = mem.companies.findIndex(c => c.id === id)
      if (idx < 0) return res.status(404).json({ error: 'Not found (mem)' })
      mem.companies[idx].status = 'active'
      return res.json({ ok: true, id, status: 'active' })
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to provision company' })
  }
})

const updateCompanySchema = z.object({
  name: z.string().min(2).max(200).optional(),
  contactEmail: z.string().email().optional(),
  status: z.enum(['active', 'pending', 'archived']).optional(),
  subdomain: z.string().optional(),
  plan: z.string().optional(),
})

// GET /admin/companies?limit=50&offset=0&status=active|pending|archived
router.get('/companies', requireAuth, requirePermission('admin.companies', 'read'), async (req, res) => {
  const prisma = getMasterPrisma()
  const limit = Math.min(Number(req.query.limit || 50), 200)
  const offset = Math.max(Number(req.query.offset || 0), 0)
  const status = typeof req.query.status === 'string' ? req.query.status : undefined
  try {
    if (prisma) {
      const where = status ? { status } : {}
      const [items, total] = await Promise.all([
        prisma.company.findMany({ where, take: limit, skip: offset, orderBy: { createdAt: 'desc' } }),
        prisma.company.count({ where })
      ])
      res.setHeader('X-Total-Count', String(total))
      return res.json({ items, total, limit, offset })
    } else {
      const all = status ? mem.companies.filter(c => c.status === status) : mem.companies
      const slice = all.slice(offset, offset + limit)
      res.setHeader('X-Total-Count', String(all.length))
      return res.json({ items: slice, total: all.length, limit, offset })
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to list companies' })
  }
})

// POST /admin/companies
router.post('/companies', requireAuth, requirePermission('admin.companies', 'create'), async (req, res) => {
  const prisma = getMasterPrisma()
  const parsed = createCompanySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  try {
    const { code, name, contactEmail, subdomain, plan } = parsed.data
    if (prisma) {
      const created = await prisma.company.create({ data: {
        code,
        name,
        contactEmail: contactEmail || '',
        subdomain: subdomain || null,
        plan: plan || 'starter',
        status: 'active',
      }})
      return res.status(201).json(created)
    } else {
      if (mem.companies.some(c => c.code === code)) return res.status(409).json({ error: 'Code already exists (mem)' })
      const now = new Date().toISOString()
      const created: MemCompany = { id: uuid(), code, name, contactEmail, subdomain: subdomain || null, plan: plan || 'starter', status: 'active', createdAt: now }
      mem.companies.unshift(created)
      pushAudit({ at: new Date().toISOString(), actor: (req as any).user?.email, action: 'company.create', resource: 'company', metadata: { code, name }, ip: (req.ip||'').toString() })
      return res.status(201).json(created)
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to create company' })
  }
})

// PATCH /admin/companies/:id
router.patch('/companies/:id', requireAuth, requirePermission('admin.companies', 'update'), async (req, res) => {
  const prisma = getMasterPrisma()
  const id = String(req.params.id)
  const parsed = updateCompanySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  try {
    if (prisma) {
      const updated = await prisma.company.update({ where: { id }, data: parsed.data })
      pushAudit({ at: new Date().toISOString(), actor: (req as any).user?.email, action: 'company.update', resource: id, metadata: parsed.data, ip: (req.ip||'').toString() })
      return res.json(updated)
    } else {
      const idx = mem.companies.findIndex(c => c.id === id)
      if (idx < 0) return res.status(404).json({ error: 'Not found (mem)' })
      mem.companies[idx] = { ...mem.companies[idx], ...(parsed.data as any) }
      pushAudit({ at: new Date().toISOString(), actor: (req as any).user?.email, action: 'company.update', resource: id, metadata: parsed.data, ip: (req.ip||'').toString() })
      return res.json(mem.companies[idx])
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to update company' })
  }
})

// DELETE /admin/companies/:id (archive)
router.delete('/companies/:id', requireAuth, requirePermission('admin.companies', 'update'), async (req, res) => {
  const prisma = getMasterPrisma()
  const id = String(req.params.id)
  try {
    if (prisma) {
      await prisma.company.update({ where: { id }, data: { status: 'archived' } })
      pushAudit({ at: new Date().toISOString(), actor: (req as any).user?.email, action: 'company.archive', resource: id, ip: (req.ip||'').toString() })
      return res.status(204).end()
    } else {
      const idx = mem.companies.findIndex(c => c.id === id)
      if (idx < 0) return res.status(404).json({ error: 'Not found (mem)' })
      mem.companies[idx].status = 'archived'
      pushAudit({ at: new Date().toISOString(), actor: (req as any).user?.email, action: 'company.archive', resource: id, ip: (req.ip||'').toString() })
      return res.status(204).end()
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to archive company' })
  }
})

// POST /admin/impersonate { companyCode }
// For MVP: return ok + companyCode; client will set x-company accordingly.
router.post('/impersonate', requireAuth, requirePermission('admin.console', 'update'), async (req, res) => {
  const schema = z.object({ companyCode: z.string().min(2) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
  const prisma = getMasterPrisma()
  try {
    if (prisma) {
      const company = await prisma.company.findUnique({ where: { code: parsed.data.companyCode } })
      if (!company || company.status === 'archived') return res.status(404).json({ error: 'Company not found' })
      try {
        await prisma.auditLog.create({ data: {
          actorEmail: (req as any).user?.email || 'unknown',
          companyId: company.id,
          action: 'impersonate',
          resource: 'company',
          metadata: { code: company.code },
          ip: (req.ip || '').toString(),
        } })
      } catch {}
      pushAudit({ at: new Date().toISOString(), actor: (req as any).user?.email, action: 'company.impersonate', resource: company.id, metadata: { code: company.code }, ip: (req.ip||'').toString() })
      return res.json({ ok: true, company: company.code, expiresIn: 900 })
    } else {
      const company = mem.companies.find(c => c.code === parsed.data.companyCode && c.status !== 'archived')
      if (!company) return res.status(404).json({ error: 'Company not found (mem)' })
      mem.audit.push({ actorEmail: (req as any).user?.email || 'unknown', action: 'impersonate', companyCode: company.code, at: new Date().toISOString() })
      pushAudit({ at: new Date().toISOString(), actor: (req as any).user?.email, action: 'company.impersonate', resource: company.id, metadata: { code: company.code }, ip: (req.ip||'').toString() })
      return res.json({ ok: true, company: company.code, expiresIn: 900 })
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to impersonate' })
  }
})

export default router
