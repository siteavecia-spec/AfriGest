"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyInventoryDeltas = applyInventoryDeltas;
const memory_1 = require("../../stores/memory");
/**
 * Apply inventory deltas for e-commerce.
 * Phase 1 (in-memory):
 * - Shared stock only (default boutiqueId = 'bq-1')
 * - Maps SKU -> productId from in-memory products
 */
function applyInventoryDeltas(tenantId, changes, options) {
    const boutiqueId = options?.boutiqueId || 'bq-1';
    let applied = 0;
    const failed = [];
    for (const ch of changes) {
        const prod = memory_1.products.find(p => p.sku === ch.sku);
        if (!prod) {
            failed.push({ sku: ch.sku, error: 'SKU not found' });
            continue;
        }
        try {
            (0, memory_1.upsertStock)(boutiqueId, prod.id, ch.delta);
            applied += 1;
        }
        catch (e) {
            failed.push({ sku: ch.sku, error: e?.message || 'apply failed' });
        }
    }
    return { applied, failed };
}
