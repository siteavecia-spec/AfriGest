// Simple ACL helper to prepare fine-grained permissions without breaking existing role guards.
// Usage (example): can('pdg', 'stock', 'read') => true/false

export type Role = 'super_admin' | 'pdg' | 'dg' | 'manager_stock' | 'caissier' | 'ecom_manager' | 'ecom_ops' | 'support' | 'marketing'

export type ModuleKey =
  | 'dashboard'
  | 'pos'
  | 'stock'
  | 'suppliers'
  | 'reports'
  | 'settings'
  | 'security'
  | 'purchase_orders'
  | 'receiving'
  | 'returns'
  | 'customers'
  | 'audit'
  | 'ecommerce.products'
  | 'ecommerce.orders'
  | 'ecommerce.settings'

export type Action = 'read' | 'create' | 'update' | 'delete' | 'approve' | 'export' | 'status_change'

// Baseline matrix (can be evolved per project needs)
export const ROLE_PERMISSIONS: Record<Role, Partial<Record<ModuleKey, Action[]>>> = {
  super_admin: {
    dashboard: ['read'],
    reports: ['read', 'export'],
    pos: ['read', 'create'],
    stock: ['read', 'create', 'update', 'delete'],
    suppliers: ['read', 'create', 'update', 'delete'],
    settings: ['read', 'update'],
    security: ['read', 'update'],
    purchase_orders: ['read', 'create', 'update', 'delete', 'status_change', 'export'],
    receiving: ['read', 'create', 'update'],
    returns: ['read', 'create', 'update', 'export'],
    customers: ['read', 'create', 'update'],
    audit: ['read', 'export'],
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
    settings: ['read', 'update'],
    purchase_orders: ['read', 'status_change', 'export'],
    receiving: ['read'],
    returns: ['read', 'export'],
    customers: ['read', 'update'],
    audit: ['read'],
    'ecommerce.products': ['read'],
    'ecommerce.orders': ['read']
  },
  dg: {
    dashboard: ['read'],
    reports: ['read'],
    pos: ['read', 'create'],
    stock: ['read', 'update'],
    suppliers: ['read', 'create', 'update'],
    purchase_orders: ['read', 'status_change'],
    receiving: ['read', 'create'],
    returns: ['read', 'create'],
    customers: ['read'],
    audit: ['read'],
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

export function can(role: Role | undefined | null, moduleKey: ModuleKey, action: Action): boolean {
  if (!role) return false
  const perms = ROLE_PERMISSIONS[role]
  const actions = perms?.[moduleKey]
  return !!actions && actions.includes(action)
}
