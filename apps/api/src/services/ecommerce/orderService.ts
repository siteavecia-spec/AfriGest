import { ecommerceOrders, EcommerceOrder, EcommerceOrderItem, EcommerceOrderStatus } from '../../stores/memory'

export async function listOrders(tenantId: string, limit = 50, offset = 0, prisma?: any): Promise<{ items: any[]; total: number }> {
  if (prisma?.ecommerceOrder) {
    const [items, total] = await Promise.all([
      prisma.ecommerceOrder.findMany({ orderBy: { createdAt: 'desc' }, skip: offset, take: limit, include: { items: true, payments: true, customer: true } }),
      prisma.ecommerceOrder.count()
    ])
    return { items, total }

export async function getTodayTopProducts(tenantId: string, prisma?: any, limit = 5): Promise<Array<{ sku: string; quantity: number; revenue: number }>> {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  if (prisma?.ecommerceOrderItem) {
    // Aggregate items for today's orders
    const rows = await prisma.ecommerceOrderItem.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: { sku: true, quantity: true, price: true }
    })
    const map = new Map<string, { qty: number; rev: number }>()
    for (const r of rows) {
      const e = map.get(r.sku) || { qty: 0, rev: 0 }
      e.qty += Number(r.quantity || 0)
      e.rev += Number(r.price || 0) * Number(r.quantity || 0)
      map.set(r.sku, e)
    }
    const arr = Array.from(map.entries()).map(([sku, v]) => ({ sku, quantity: v.qty, revenue: v.rev }))
    arr.sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
    return arr.slice(0, limit)
  }
  // Memory mode
  const todays = ecommerceOrders.filter(o => new Date(o.createdAt).getTime() >= start.getTime() && new Date(o.createdAt).getTime() < end.getTime() && o.tenantId === tenantId)
  const map = new Map<string, { qty: number; rev: number }>()
  for (const o of todays) {
    for (const it of (o.items || [])) {
      const e = map.get(it.sku) || { qty: 0, rev: 0 }
      e.qty += Number(it.quantity || 0)
      e.rev += Number(it.price || 0) * Number(it.quantity || 0)
      map.set(it.sku, e)
    }
  }
  const arr = Array.from(map.entries()).map(([sku, v]) => ({ sku, quantity: v.qty, revenue: v.rev }))
  arr.sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
  return arr.slice(0, limit)
}
  }
  const all = ecommerceOrders.filter(o => o.tenantId === tenantId)
  const total = all.length
  const items = all.slice().reverse().slice(offset, offset + limit)
  return { items, total }
}

export async function createOrder(params: { tenantId: string; items: EcommerceOrderItem[]; customerEmail?: string; customerPhone?: string; currency?: string }, prisma?: any): Promise<any> {
  const currency = params.currency || 'GNF'
  const total = params.items.reduce((s, it) => s + it.price * it.quantity, 0)
  if (prisma?.ecommerceOrder) {
    const created = await prisma.ecommerceOrder.create({
      data: {
        total,
        currency,
        status: 'received',
        customer: params.customerEmail ? { connectOrCreate: { where: { email: params.customerEmail }, create: { email: params.customerEmail, phone: params.customerPhone } } } : undefined,
        items: { create: params.items.map(it => ({ sku: it.sku, quantity: it.quantity, price: it.price, currency })) }
      },
      include: { items: true, customer: true }
    })
    // Audit log (best-effort)
    try {
      await prisma.auditLog.create({ data: { action: 'order.create', resource: 'ecommerce.order', resourceId: created.id, metadata: { total, currency }, createdAt: new Date() } })
    } catch {}
    return created
  }
  const order: EcommerceOrder = {
    id: `eco-${Date.now()}`,
    tenantId: params.tenantId,
    items: params.items.map(it => ({ sku: it.sku, quantity: it.quantity, price: it.price, currency })),
    total,
    currency,
    status: 'received',
    createdAt: new Date().toISOString(),
    customerEmail: params.customerEmail,
    customerPhone: params.customerPhone
  }
  ecommerceOrders.push(order)
  return order
}

export async function updateOrderStatus(orderId: string, status: EcommerceOrderStatus, prisma?: any): Promise<any | null> {
  if (prisma?.ecommerceOrder) {
    try {
      const updated = await prisma.ecommerceOrder.update({ where: { id: orderId }, data: { status } })
      try { await prisma.auditLog.create({ data: { action: 'order.status.update', resource: 'ecommerce.order', resourceId: orderId, metadata: { status }, createdAt: new Date() } }) } catch {}
      return updated
    } catch { return null }
  }
  const idx = ecommerceOrders.findIndex(o => o.id === orderId)
  if (idx === -1) return null
  ecommerceOrders[idx] = { ...ecommerceOrders[idx], status }
  return ecommerceOrders[idx]
}

export async function getTodayOnlineKPIs(tenantId: string, prisma?: any): Promise<{ onlineCount: number; onlineRevenue: number; paidCount: number; averageOrderValuePaid: number }> {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  if (prisma?.ecommerceOrder) {
    const [items, paidItems] = await Promise.all([
      prisma.ecommerceOrder.findMany({ where: { createdAt: { gte: start, lt: end } }, select: { total: true } }),
      prisma.ecommerceOrder.findMany({ where: { createdAt: { gte: start, lt: end }, paymentStatus: 'paid' }, select: { total: true } })
    ])
    const onlineCount = items.length
    const onlineRevenue = items.reduce((s: number, o: any) => s + Number(o.total || 0), 0)
    const paidCount = paidItems.length
    const paidRevenue = paidItems.reduce((s: number, o: any) => s + Number(o.total || 0), 0)
    const averageOrderValuePaid = paidCount > 0 ? paidRevenue / paidCount : 0
    return { onlineCount, onlineRevenue, paidCount, averageOrderValuePaid }
  }
  const todays = ecommerceOrders.filter(o => new Date(o.createdAt).getTime() >= start.getTime() && new Date(o.createdAt).getTime() < end.getTime())
  const onlineCount = todays.length
  const onlineRevenue = todays.reduce((s, o) => s + (o.total || 0), 0)
  const paidCount = 0
  const averageOrderValuePaid = 0
  return { onlineCount, onlineRevenue, paidCount, averageOrderValuePaid }
}
