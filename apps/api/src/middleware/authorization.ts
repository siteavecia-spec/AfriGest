import type { Request, Response, NextFunction } from 'express'

// Backend permission types aligned with frontend acl.ts
export type Role =
  | 'super_admin'
  | 'support'
  | 'pdg'
  | 'dr'
  | 'dg'
  | 'manager_stock'
  | 'caissier'
  | 'employee'
  | 'ecom_manager'
  | 'ecom_ops'
  | 'marketing'
export type ModuleKey =
  | 'dashboard'
  | 'pos'
  | 'stock'
  | 'suppliers'
  | 'reports'
  | 'settings'
  | 'security'
  | 'users'
  | 'audit'
  | 'purchase_orders'
  | 'receiving'
  | 'returns'
  | 'customers'
  | 'admin.console'
  | 'admin.companies'
  | 'admin.audit_tech'
  | 'support.session'
  | 'messaging'
  | 'ecommerce.products'
  | 'ecommerce.orders'
  | 'ecommerce.settings'
export type Action = 'read' | 'create' | 'update' | 'delete' | 'approve' | 'export' | 'status_change' | 'suspend' | 'activate' | 'revoke'

const ROLE_PERMISSIONS: Record<Role, Partial<Record<ModuleKey, Action[]>>> = {
  super_admin: {
    // Platform-only; no business data access
    dashboard: ['read'],
    security: ['read', 'update'],
    settings: ['read', 'update'],
    'admin.console': ['read', 'update'],
    'admin.companies': ['read', 'create', 'update'],
    'admin.audit_tech': ['read', 'export'],
    messaging: ['read', 'create', 'update']
  },
  support: {
    // Read-only diagnostic; enforced with support_until
    dashboard: ['read'],
    reports: ['read'],
    audit: ['read'],
    'support.session': ['read', 'activate', 'revoke']
  },
  pdg: {
    dashboard: ['read'],
    reports: ['read', 'export'],
    pos: ['read', 'create'],
    stock: ['read', 'create', 'update'],
    suppliers: ['read'],
    users: ['read', 'create', 'update', 'suspend'],
    settings: ['read', 'update'],
    purchase_orders: ['read', 'status_change', 'export'],
    receiving: ['read'],
    returns: ['read', 'export'],
    customers: ['read', 'update'],
    audit: ['read'],
    'ecommerce.products': ['read'],
    'ecommerce.orders': ['read'],
    messaging: ['read', 'create']
  },
  dr: {
    dashboard: ['read'],
    reports: ['read', 'export'],
    stock: ['read', 'update'],
    pos: ['read', 'create'],
    purchase_orders: ['read', 'status_change'],
    receiving: ['read', 'create'],
    returns: ['read', 'create'],
    customers: ['read'],
    audit: ['read'],
    messaging: ['read', 'create']
  },
  dg: {
    dashboard: ['read'],
    reports: ['read'],
    pos: ['read', 'create', 'update'],
    stock: ['read', 'create', 'update'],
    suppliers: ['read'],
    users: ['read', 'update'],
    purchase_orders: ['read', 'status_change'],
    receiving: ['read', 'create'],
    returns: ['read', 'create'],
    customers: ['read'],
    audit: ['read'],
    'ecommerce.products': ['read', 'update'],
    'ecommerce.orders': ['read', 'status_change'],
    messaging: ['read', 'create']
  },
  manager_stock: {
    stock: ['read', 'create', 'update'],
    suppliers: ['read', 'create', 'update'],
    purchase_orders: ['read', 'create', 'update'],
    receiving: ['read', 'create'],
    returns: ['read']
  },
  caissier: {
    pos: ['read', 'create']
  },
  employee: {
    dashboard: ['read'],
    pos: ['read'],
    messaging: ['read', 'create']
  },
  ecom_manager: {
    'ecommerce.products': ['read', 'create', 'update', 'approve'],
    'ecommerce.orders': ['read', 'status_change'],
    'ecommerce.settings': ['read', 'update'],
    messaging: ['read', 'create']
  },
  ecom_ops: {
    'ecommerce.orders': ['read', 'status_change'],
    messaging: ['read', 'create']
  },
  marketing: {
    reports: ['read', 'export']
  }
}

function can(role: Role | undefined | null, moduleKey: ModuleKey, action: Action, req?: Request): boolean {
  if (!role) return false
  // Special handling for support: read-only and time-bounded
  if (role === 'support') {
    const auth: any = (req as any)?.auth
    const untilStr: string | undefined = auth?.support_until
    const now = Date.now()
    const until = untilStr ? Date.parse(untilStr) : 0
    if (!until || until < now) return false
    // allow only read everywhere except limited lifecycle actions on support.session
    if (moduleKey !== 'support.session' && action !== 'read') return false
    if (moduleKey === 'support.session' && !['read', 'activate', 'revoke'].includes(action)) return false
  }
  const perms = ROLE_PERMISSIONS[role]
  const actions = perms?.[moduleKey]
  return !!actions && actions.includes(action)
}

// Extract role and tenant according to your auth implementation
function getUserRole(req: Request): Role | null {
  // Read from auth middleware payload
  const auth: any = (req as any).auth
  return (auth?.role as Role) || null
}

export function requirePermission(moduleKey: ModuleKey, action: Action) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = getUserRole(req)
      if (!can(role, moduleKey, action, req)) {
        return res.status(403).json({ error: 'forbidden', module: moduleKey, action })
      }
      return next()
    } catch (e) {
      return res.status(500).json({ error: 'authz_error' })
    }
  }
}
