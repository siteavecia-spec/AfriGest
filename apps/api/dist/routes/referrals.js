"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const rbac_1 = require("../middleware/rbac");
const memory_1 = require("../stores/memory");
const router = (0, express_1.Router)();
function companyFromReq(req) {
    const h = (req.headers['x-company'] || '').toString();
    return h || 'DEMO';
}
function genCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++)
        s += alphabet[Math.floor(Math.random() * alphabet.length)];
    return `AFG-${s}`;
}
router.get('/code', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin', 'pdg', 'dg'), (req, res) => {
    const company = companyFromReq(req);
    let entry = memory_1.referralCodes.find(r => (r.owner === company) && r.isActive);
    if (!entry) {
        entry = { code: genCode(), owner: company, isActive: true };
        memory_1.referralCodes.push(entry);
    }
    return res.json({ code: entry.code, company });
});
router.get('/leads', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin', 'pdg', 'dg'), (req, res) => {
    const company = companyFromReq(req);
    const active = memory_1.referralCodes.find(r => r.owner === company && r.isActive);
    if (!active)
        return res.json([]);
    const code = active.code.toLowerCase();
    const rows = memory_1.demoRequests.filter(d => (d.referralCode || '').toLowerCase() === code)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return res.json(rows);
});
router.post('/generate', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin', 'pdg', 'dg'), (req, res) => {
    const company = companyFromReq(req);
    // deactivate old
    memory_1.referralCodes.forEach(r => { if (r.owner === company)
        r.isActive = false; });
    const entry = { code: genCode(), owner: company, isActive: true };
    memory_1.referralCodes.push(entry);
    return res.status(201).json({ code: entry.code, company });
});
router.get('/stats', auth_1.requireAuth, (0, rbac_1.requireRole)('super_admin', 'pdg', 'dg'), (req, res) => {
    const company = companyFromReq(req);
    const active = memory_1.referralCodes.find(r => r.owner === company && r.isActive);
    if (!active)
        return res.json({ totalLeads: 0, leadsThisMonth: 0 });
    const code = active.code;
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const monthStart = new Date(y, m, 1).getTime();
    const totalLeads = memory_1.demoRequests.filter(d => (d.referralCode || '').toLowerCase() === code.toLowerCase()).length;
    const leadsThisMonth = memory_1.demoRequests.filter(d => (d.referralCode || '').toLowerCase() === code.toLowerCase() && new Date(d.createdAt).getTime() >= monthStart).length;
    return res.json({ totalLeads, leadsThisMonth });
});
exports.default = router;
