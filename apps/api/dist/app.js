"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const health_1 = __importDefault(require("./routes/health"));
const tenant_1 = require("./middleware/tenant");
const auth_1 = __importDefault(require("./routes/auth"));
const passwordReset_1 = __importDefault(require("./routes/passwordReset"));
const products_1 = __importDefault(require("./routes/products"));
const suppliers_1 = __importDefault(require("./routes/suppliers"));
const stock_1 = __importDefault(require("./routes/stock"));
const sales_1 = __importDefault(require("./routes/sales"));
const public_1 = __importDefault(require("./routes/public"));
const referrals_1 = __importDefault(require("./routes/referrals"));
const alerts_1 = __importDefault(require("./routes/alerts"));
const leads_1 = __importDefault(require("./routes/leads"));
const superAdmin_1 = __importDefault(require("./routes/superAdmin"));
const admin_1 = __importDefault(require("./routes/admin"));
const users_1 = __importDefault(require("./routes/users"));
const ecommerce_1 = __importDefault(require("./routes/ecommerce"));
const transfers_1 = __importDefault(require("./routes/transfers"));
const boutiques_1 = __importDefault(require("./routes/boutiques"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const paymentService_1 = require("./services/ecommerce/paymentService");
const db_1 = require("./db");
const messaging_1 = __importDefault(require("./routes/messaging"));
const dev_1 = __importDefault(require("./routes/dev"));
const logger_1 = require("./middleware/logger");
const rateLimit_1 = require("./middleware/rateLimit");
const errorHandler_1 = require("./middleware/errorHandler");
const env_1 = require("./config/env");
const restock_1 = __importDefault(require("./routes/restock"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
// CORS: in non-dev, restrict to ALLOWED_ORIGINS if provided (comma-separated)
const allowedOrigins = (env_1.env.NODE_ENV !== 'development' && env_1.env.ALLOWED_ORIGINS)
    ? env_1.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
    : null;
app.use((0, cors_1.default)({ origin: (allowedOrigins && allowedOrigins.length > 0) ? allowedOrigins : true, credentials: true }));
app.use((0, compression_1.default)());
// Express tuning
app.set('etag', 'strong');
app.set('trust proxy', true);
// Mount Stripe webhook raw body endpoint BEFORE json parser to validate signatures
app.post('/api/tenants/:tenantId/ecommerce/webhooks/stripe', express_1.default.raw({ type: 'application/json' }), (req, res) => {
    const { tenantId } = req.params;
    const prisma = (0, db_1.getTenantClientFromReq)(req);
    return (0, paymentService_1.handleStripeWebhook)(req, res, prisma, tenantId);
});
app.use(express_1.default.json({ limit: '1mb' }));
app.use((0, morgan_1.default)('dev'));
app.use(logger_1.requestLogger);
app.use((0, rateLimit_1.rateLimit)({ windowMs: 60000, limit: 120 }));
// Resolve tenant for each request (company code or subdomain in header for MVP)
app.use(tenant_1.tenantResolver);
app.use('/health', health_1.default);
app.use('/auth', auth_1.default);
app.use('/auth', passwordReset_1.default);
app.use('/products', products_1.default);
app.use('/suppliers', suppliers_1.default);
app.use('/stock', stock_1.default);
app.use('/sales', sales_1.default);
app.use('/public', public_1.default);
app.use('/referrals', referrals_1.default);
app.use('/leads', leads_1.default);
app.use('/super-admin', superAdmin_1.default);
app.use('/admin', admin_1.default);
app.use('/users', users_1.default);
app.use('/alerts', alerts_1.default);
app.use('/transfers', transfers_1.default);
app.use('/boutiques', boutiques_1.default);
app.use('/inventory', inventory_1.default);
app.use('/restock', restock_1.default);
// Dev utilities (seed, local tools)
app.use('/dev', dev_1.default);
// E-commerce module endpoints: /api/tenants/:tenantId/ecommerce/*
app.use('/api/tenants', ecommerce_1.default);
// AfriTalk messaging endpoints: /api/tenants/:tenantId/messaging/*
app.use('/api/tenants', messaging_1.default);
// 404 and error handlers (must be after routes)
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
exports.default = app;
