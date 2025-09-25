import { Router } from 'express'
import productsRouter from './products'
import ordersRouter from './orders'
import customersRouter from './customers'
import syncInventoryRouter from './syncInventory'
import summaryRouter from './summary'
import webhooksRouter from './webhooks'

// Base router: /tenants/:tenantId/ecommerce
const router = Router()

router.use('/:tenantId/ecommerce/products', productsRouter)
router.use('/:tenantId/ecommerce/orders', ordersRouter)
router.use('/:tenantId/ecommerce/customers', customersRouter)
router.use('/:tenantId/ecommerce/sync-inventory', syncInventoryRouter)
router.use('/:tenantId/ecommerce/summary', summaryRouter)
router.use('/:tenantId/ecommerce/webhooks', webhooksRouter)

export default router
