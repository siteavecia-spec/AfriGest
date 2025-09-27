"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
function requireRole(...allowed) {
    return (req, res, next) => {
        const auth = req.auth;
        if (!auth)
            return res.status(401).json({ error: 'Not authenticated' });
        if (!allowed.includes(auth.role))
            return res.status(403).json({ error: 'Forbidden' });
        next();
    };
}
