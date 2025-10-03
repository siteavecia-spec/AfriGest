"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const products_1 = __importDefault(require("./products"));
const orders_1 = __importDefault(require("./orders"));
const customers_1 = __importDefault(require("./customers"));
const syncInventory_1 = __importDefault(require("./syncInventory"));
const summary_1 = __importDefault(require("./summary"));
const webhooks_1 = __importDefault(require("./webhooks"));
const uploads_1 = __importDefault(require("./uploads"));
const media_1 = __importDefault(require("./media"));
const payments_1 = __importDefault(require("./payments"));
const overview_1 = __importDefault(require("./overview"));
// Base router: /tenants/:tenantId/ecommerce
const router = (0, express_1.Router)();
router.use('/:tenantId/ecommerce/products', products_1.default);
router.use('/:tenantId/ecommerce/orders', orders_1.default);
router.use('/:tenantId/ecommerce/customers', customers_1.default);
router.use('/:tenantId/ecommerce/sync-inventory', syncInventory_1.default);
router.use('/:tenantId/ecommerce/summary', summary_1.default);
router.use('/:tenantId/ecommerce/overview', overview_1.default);
router.use('/:tenantId/ecommerce/webhooks', webhooks_1.default);
router.use('/:tenantId/ecommerce/uploads', uploads_1.default);
router.use('/:tenantId/ecommerce/media', media_1.default);
router.use('/:tenantId/ecommerce/payments', payments_1.default);
exports.default = router;
