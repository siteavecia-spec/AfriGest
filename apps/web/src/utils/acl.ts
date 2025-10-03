// Simple ACL helper to prepare fine-grained permissions without breaking existing role guards.
// Usage (example): can('pdg', 'stock', 'read') => true/false

export type Role =
  | 'super_admin'           // Plateforme
  | 'support'               // Technique (temporaire)
  | 'pdg'                   // Entreprise
  | 'dr'                    // Directeur régional (Phase 2)
  | 'dg'                    // DG Boutique
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
  | 'ecommerce.products'
  | 'ecommerce.orders'
  | 'ecommerce.settings'

export type Action = 'read' | 'create' | 'update' | 'delete' | 'approve' | 'export' | 'status_change' | 'suspend' | 'activate' | 'revoke'

// Revised baseline matrix aligned with business/technical separation & least privilege
export const ROLE_PERMISSIONS: Record<Role, Partial<Record<ModuleKey, Action[]>>> = {
  super_admin: {
    // Tenant-level super admin: broad access to all modules
    dashboard: ['read'],
    reports: ['read', 'export'],
    security: ['read', 'update'],
    settings: ['read', 'update'],
    pos: ['read', 'create', 'update'],
    stock: ['read', 'create', 'update'],
    suppliers: ['read', 'create', 'update', 'delete'],
    users: ['read', 'create', 'update', 'suspend'],
    purchase_orders: ['read', 'status_change', 'export'],
    receiving: ['read', 'create'],
    returns: ['read', 'create'],
    customers: ['read', 'update'],
    audit: ['read', 'export'],
    'ecommerce.products': ['read', 'create', 'update', 'approve'],
    'ecommerce.orders': ['read', 'status_change'],
    'ecommerce.settings': ['read', 'update'],
    // Platform console remains
    'admin.console': ['read', 'update'],
    'admin.companies': ['read', 'create', 'update'],
    'admin.audit_tech': ['read', 'export']
  },
  support: {
    // As per role sheet: reports only (UI read-only)
    reports: ['read']
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
    'ecommerce.orders': ['read']
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
    audit: ['read']
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
    'ecommerce.orders': ['read', 'status_change']
  },
  manager_stock: {
    stock: ['read', 'create', 'update'],
    suppliers: ['read', 'create', 'update'],
    purchase_orders: ['read', 'create', 'update'],
    receiving: ['read', 'create'],
    returns: ['read'],
    reports: ['read', 'export']
  },
  caissier: {
    dashboard: ['read'],
    pos: ['read', 'create']
  },
  employee: {
    dashboard: ['read'],
    pos: ['read']
  },
  ecom_manager: {
    'ecommerce.products': ['read', 'create', 'update', 'approve'],
    'ecommerce.orders': ['read', 'status_change'],
    'ecommerce.settings': ['read', 'update']
  },
  ecom_ops: {
    'ecommerce.orders': ['read', 'status_change']
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
