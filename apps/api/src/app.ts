import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import healthRouter from './routes/health'
import { tenantResolver } from './middleware/tenant'
import authRouter from './routes/auth'
import passwordResetRouter from './routes/passwordReset'
import productsRouter from './routes/products'
import suppliersRouter from './routes/suppliers'
import stockRouter from './routes/stock'
import salesRouter from './routes/sales'
import publicRouter from './routes/public'
import referralsRouter from './routes/referrals'
import alertsRouter from './routes/alerts'
import leadsRouter from './routes/leads'
import superAdminRouter from './routes/superAdmin'
import adminRouter from './routes/admin'
import usersRouter from './routes/users'
import ecommerceRouter from './routes/ecommerce'
import transfersRouter from './routes/transfers'
import boutiquesRouter from './routes/boutiques'
import inventoryRouter from './routes/inventory'
import { handleStripeWebhook } from './services/ecommerce/paymentService'
import { getTenantClientFromReq } from './db'
import messagingRouter from './routes/messaging'
import devRouter from './routes/dev'
import { requestLogger } from './middleware/logger'
import { rateLimit } from './middleware/rateLimit'
import { notFoundHandler, errorHandler } from './middleware/errorHandler'
import { env } from './config/env'
import restockRouter from './routes/restock'

const app = express()
app.use(helmet())
// CORS: in non-dev, restrict to ALLOWED_ORIGINS if provided (comma-separated)
const allowedOrigins = (env.NODE_ENV !== 'development' && env.ALLOWED_ORIGINS)
  ? env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : null
app.use(cors({ origin: (allowedOrigins && allowedOrigins.length > 0) ? allowedOrigins : true, credentials: true }))
app.use(compression())
// Express tuning
app.set('etag', 'strong')
app.set('trust proxy', true)
// Mount Stripe webhook raw body endpoint BEFORE json parser to validate signatures
app.post('/api/tenants/:tenantId/ecommerce/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  const { tenantId } = req.params as { tenantId: string }
  const prisma = getTenantClientFromReq(req as any)
  return handleStripeWebhook(req as any, res, prisma, tenantId)
})
app.use(express.json({ limit: '1mb' }))
app.use(morgan('dev'))
app.use(requestLogger)
app.use(rateLimit({ windowMs: 60_000, limit: 120 }))

// Resolve tenant for each request (company code or subdomain in header for MVP)
app.use(tenantResolver)

app.use('/health', healthRouter)
app.use('/auth', authRouter)
app.use('/auth', passwordResetRouter)
app.use('/products', productsRouter)
app.use('/suppliers', suppliersRouter)
app.use('/stock', stockRouter)
app.use('/sales', salesRouter)
app.use('/public', publicRouter)
app.use('/referrals', referralsRouter)
app.use('/leads', leadsRouter)
app.use('/super-admin', superAdminRouter)
app.use('/admin', adminRouter)
app.use('/users', usersRouter)
app.use('/alerts', alertsRouter)
app.use('/transfers', transfersRouter)
app.use('/boutiques', boutiquesRouter)
app.use('/inventory', inventoryRouter)
app.use('/restock', restockRouter)
// Dev utilities (seed, local tools)
app.use('/dev', devRouter)
// E-commerce module endpoints: /api/tenants/:tenantId/ecommerce/*
app.use('/api/tenants', ecommerceRouter)
// AfriTalk messaging endpoints: /api/tenants/:tenantId/messaging/*
app.use('/api/tenants', messagingRouter)

// 404 and error handlers (must be after routes)
app.use(notFoundHandler)
app.use(errorHandler as any)

export default app


