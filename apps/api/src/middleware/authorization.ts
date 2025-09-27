import type { Request, Response, NextFunction } from 'express'

// Backend permission types aligned with frontend acl.ts
export type Role = 'super_admin' | 'pdg' | 'dg' | 'manager_stock' | 'caissier' | 'ecom_manager' | 'ecom_ops' | 'support' | 'marketing'
export type ModuleKey =
  | 'dashboard'
  | 'pos'
  | 'stock'
  | 'suppliers'
  | 'reports'
  | 'settings'
  | 'security'
  | 'ecommerce.products'
  | 'ecommerce.orders'
  | 'ecommerce.settings'
export type Action = 'read' | 'create' | 'update' | 'delete' | 'approve' | 'export' | 'status_change'

const ROLE_PERMISSIONS: Record<Role, Partial<Record<ModuleKey, Action[]>>> = {
  super_admin: {
    dashboard: ['read'],
    reports: ['read', 'export'],
    pos: ['read', 'create'],
    stock: ['read', 'create', 'update', 'delete'],
    suppliers: ['read', 'create', 'update', 'delete'],
    settings: ['read', 'update'],
    security: ['read', 'update'],
    'ecommerce.products': ['read', 'create', 'update', 'delete', 'approve'],
    'ecommerce.orders': ['read', 'update', 'status_change', 'approve'],
    'ecommerce.settings': ['read', 'update']
  },
  pdg: {
    dashboard: ['read'],
    reports: ['read', 'export'],
    pos: ['read'],
    stock: ['read'],
    suppliers: ['read'],
    'ecommerce.products': ['read'],
    'ecommerce.orders': ['read']
  },
  dg: {
    dashboard: ['read'],
    reports: ['read'],
    pos: ['read', 'create'],
    stock: ['read', 'update'],
    suppliers: ['read', 'create', 'update'],
    'ecommerce.products': ['read', 'update'],
    'ecommerce.orders': ['read', 'status_change']
  },
  manager_stock: {
    stock: ['read', 'create', 'update'],
    suppliers: ['read', 'create', 'update']
  },
  caissier: {
    pos: ['read', 'create']
  },
  ecom_manager: {
    'ecommerce.products': ['read', 'create', 'update', 'approve'],
    'ecommerce.orders': ['read', 'status_change'],
    'ecommerce.settings': ['read', 'update']
  },
  ecom_ops: {
    'ecommerce.orders': ['read', 'status_change']
  },
  support: {
    reports: ['read']
  },
  marketing: {
    reports: ['read', 'export']
  }
}

function can(role: Role | undefined | null, moduleKey: ModuleKey, action: Action): boolean {
  if (!role) return false
  const perms = ROLE_PERMISSIONS[role]
  const actions = perms?.[moduleKey]
  return !!actions && actions.includes(action)
}

// Extract role and tenant according to your auth implementation
function getUserRole(req: Request): Role | null {
  // Example: from req.user injected by auth middleware or from JWT claims
  // Adjust this to your actual auth stack
  // @ts-ignore
  return (req.user?.role as Role) || null
}

export function requirePermission(moduleKey: ModuleKey, action: Action) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const role = getUserRole(req)
      if (!can(role, moduleKey, action)) {
        return res.status(403).json({ error: 'forbidden', module: moduleKey, action })
      }
      return next()
    } catch (e) {
      return res.status(500).json({ error: 'authz_error' })
    }
  }
}
