import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { requireAuth } from '../middleware/auth'
import { requirePermission } from '../middleware/authorization'
import { getTenantPrisma } from '../db/tenant'
import { env } from '../config/env'

const router = Router()

// Helpers
function prismaFrom(req: any) {
  const dbUrl = req.tenantDbUrl || env.TENANT_DATABASE_URL
  return getTenantPrisma(dbUrl)
}

// GET /users?query=&limit=&offset=
router.get('/', requireAuth, requirePermission('users', 'read'), async (req, res) => {
  const q = (req.query.query || '').toString().trim()
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0
  const prisma = prismaFrom(req)
  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: 'insensitive' as const } },
          { fullName: { contains: q, mode: 'insensitive' as const } }
        ]
      }
    : {}
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, email: true, fullName: true, role: true, status: true, lastLoginAt: true },
      orderBy: { email: 'asc' },
      take: limit,
      skip: offset
    }),
    prisma.user.count({ where })
  ])
  res.json({ items, total, limit, offset })
})

// GET /users/:id
router.get('/:id', requireAuth, requirePermission('users', 'read'), async (req, res) => {
  const prisma = prismaFrom(req)
  const user = await prisma.user.findUnique({ where: { id: req.params.id } })
  if (!user) return res.status(404).json({ error: 'Not found' })
  const { passwordHash, ...safe } = user as any
  res.json(safe)
})

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  role: z.enum([
    'super_admin',
    'support',
    'pdg',
    'dr',
    'dg',
    'manager_stock',
    'caissier',
    'employee',
    'ecom_manager',
    'ecom_ops',
    'marketing'
  ] as const).default('employee')
})

// POST /users
router.post('/', requireAuth, requirePermission('users', 'create'), async (req, res) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  const { email, password, fullName, role } = parsed.data
  const prisma = prismaFrom(req)
  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (exists) return res.status(409).json({ error: 'Email already exists' })
  const passwordHash = await bcrypt.hash(password, 10)
  const created = await prisma.user.create({
    data: { email: email.toLowerCase(), passwordHash, fullName, role: role as any, status: 'active' },
    select: { id: true, email: true, fullName: true, role: true, status: true }
  })
  // Best-effort audit
  try {
    const actor = (req as any).auth
    await prisma.auditLog.create({ data: {
      actorId: actor?.sub,
      role: actor?.role,
      action: 'user.create',
      resourceId: created.id,
      metadata: { email: created.email, role: created.role },
      ip: (req.headers['x-forwarded-for'] || req.ip || '').toString()
    } as any })
  } catch {}
  res.status(201).json(created)
})

const updateSchema = z.object({
  fullName: z.string().min(1).optional(),
  role: z.enum([
    'super_admin',
    'support',
    'pdg',
    'dr',
    'dg',
    'manager_stock',
    'caissier',
    'employee',
    'ecom_manager',
    'ecom_ops',
    'marketing'
  ] as const).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  password: z.string().min(8).optional()
})

// PATCH /users/:id
router.patch('/:id', requireAuth, requirePermission('users', 'update'), async (req, res) => {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() })
  const prisma = prismaFrom(req)
  const data: any = {}
  if (parsed.data.fullName !== undefined) data.fullName = parsed.data.fullName
  if (parsed.data.role !== undefined) data.role = parsed.data.role
  if (parsed.data.status !== undefined) data.status = parsed.data.status
  if (parsed.data.password) data.passwordHash = await bcrypt.hash(parsed.data.password, 10)
  try {
    const updated = await prisma.user.update({ where: { id: req.params.id }, data, select: { id: true, email: true, fullName: true, role: true, status: true } })
    // Audit
    try {
      const actor = (req as any).auth
      await prisma.auditLog.create({ data: {
        actorId: actor?.sub,
        role: actor?.role,
        action: 'user.update',
        resourceId: updated.id,
        metadata: data,
        ip: (req.headers['x-forwarded-for'] || req.ip || '').toString()
      } as any })
    } catch {}
    res.json(updated)
  } catch {
    res.status(404).json({ error: 'Not found' })
  }
})

// DELETE /users/:id  (soft delete -> status = disabled)
router.delete('/:id', requireAuth, requirePermission('users', 'suspend'), async (req, res) => {
  const prisma = prismaFrom(req)
  try {
    const updated = await prisma.user.update({ where: { id: req.params.id }, data: { status: 'disabled' }, select: { id: true, email: true, status: true } })
    try {
      const actor = (req as any).auth
      await prisma.auditLog.create({ data: {
        actorId: actor?.sub,
        role: actor?.role,
        action: 'user.deactivate',
        resourceId: updated.id,
        metadata: { email: updated.email },
        ip: (req.headers['x-forwarded-for'] || req.ip || '').toString()
      } as any })
    } catch {}
    res.json({ ok: true })
  } catch {
    res.status(404).json({ error: 'Not found' })
  }
})

export default router
