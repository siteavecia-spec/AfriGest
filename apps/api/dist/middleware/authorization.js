"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = requirePermission;
const ROLE_PERMISSIONS = {
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
};
function can(role, moduleKey, action, req) {
    if (!role)
        return false;
    // Special handling for support: read-only and time-bounded
    if (role === 'support') {
        const auth = req?.auth;
        const untilStr = auth?.support_until;
        const now = Date.now();
        const until = untilStr ? Date.parse(untilStr) : 0;
        if (!until || until < now)
            return false;
        // allow only read everywhere except limited lifecycle actions on support.session
        if (moduleKey !== 'support.session' && action !== 'read')
            return false;
        if (moduleKey === 'support.session' && !['read', 'activate', 'revoke'].includes(action))
            return false;
    }
    const perms = ROLE_PERMISSIONS[role];
    const actions = perms?.[moduleKey];
    return !!actions && actions.includes(action);
}
// Extract role and tenant according to your auth implementation
function getUserRole(req) {
    // Read from auth middleware payload
    const auth = req.auth;
    return auth?.role || null;
}
function requirePermission(moduleKey, action) {
    return (req, res, next) => {
        try {
            const role = getUserRole(req);
            if (!can(role, moduleKey, action, req)) {
                return res.status(403).json({ error: 'forbidden', module: moduleKey, action });
            }
            return next();
        }
        catch (e) {
            return res.status(500).json({ error: 'authz_error' });
        }
    };
}
