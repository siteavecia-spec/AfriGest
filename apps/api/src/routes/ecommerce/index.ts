import { Router } from 'express'
import productsRouter from './products'
import ordersRouter from './orders'
import customersRouter from './customers'
import syncInventoryRouter from './syncInventory'
import summaryRouter from './summary'
import webhooksRouter from './webhooks'
import uploadsRouter from './uploads'
import mediaRouter from './media'
import paymentsRouter from './payments'
import overviewRouter from './overview'

// Base router: /tenants/:tenantId/ecommerce
const router = Router()

router.use('/:tenantId/ecommerce/products', productsRouter)
router.use('/:tenantId/ecommerce/orders', ordersRouter)
router.use('/:tenantId/ecommerce/customers', customersRouter)
router.use('/:tenantId/ecommerce/sync-inventory', syncInventoryRouter)
router.use('/:tenantId/ecommerce/summary', summaryRouter)
router.use('/:tenantId/ecommerce/overview', overviewRouter)
router.use('/:tenantId/ecommerce/webhooks', webhooksRouter)
router.use('/:tenantId/ecommerce/uploads', uploadsRouter)
router.use('/:tenantId/ecommerce/media', mediaRouter)
router.use('/:tenantId/ecommerce/payments', paymentsRouter)

export default router
