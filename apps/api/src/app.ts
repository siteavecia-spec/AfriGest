import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
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
import leadsRouter from './routes/leads'
import superAdminRouter from './routes/superAdmin'
import usersRouter from './routes/users'
import ecommerceRouter from './routes/ecommerce'
import { handleStripeWebhook } from './services/ecommerce/paymentService'
import { getTenantClientFromReq } from './db'
import messagingRouter from './routes/messaging'

const app = express()
app.use(helmet())
app.use(cors({ origin: true, credentials: true }))
// Mount Stripe webhook raw body endpoint BEFORE json parser to validate signatures
app.post('/api/tenants/:tenantId/ecommerce/webhooks/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  const { tenantId } = req.params as { tenantId: string }
  const prisma = getTenantClientFromReq(req as any)
  return handleStripeWebhook(req as any, res, prisma, tenantId)
})
app.use(express.json())
app.use(morgan('dev'))

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
app.use('/users', usersRouter)
// E-commerce module endpoints: /api/tenants/:tenantId/ecommerce/*
app.use('/api/tenants', ecommerceRouter)
// AfriTalk messaging endpoints: /api/tenants/:tenantId/messaging/*
app.use('/api/tenants', messagingRouter)

export default app


