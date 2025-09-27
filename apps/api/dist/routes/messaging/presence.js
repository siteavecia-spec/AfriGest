"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const ws_1 = require("../../ws");
const router = (0, express_1.Router)({ mergeParams: true });
// GET /api/tenants/:tenantId/presence
router.get('/', auth_1.requireAuth, async (req, res) => {
    const { tenantId } = req.params;
    try {
        const items = (0, ws_1.getPresenceSnapshot)(tenantId);
        return res.json({ tenantId, items });
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to get presence snapshot' });
    }
});
exports.default = router;
