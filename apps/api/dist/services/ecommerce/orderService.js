"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOrders = listOrders;
exports.createOrder = createOrder;
exports.updateOrderStatus = updateOrderStatus;
exports.getTodayOnlineKPIs = getTodayOnlineKPIs;
const memory_1 = require("../../stores/memory");
async function listOrders(tenantId, limit = 50, offset = 0, prisma) {
    if (prisma?.ecommerceOrder) {
        const [items, total] = await Promise.all([
            prisma.ecommerceOrder.findMany({ orderBy: { createdAt: 'desc' }, skip: offset, take: limit, include: { items: true, payments: true, customer: true } }),
            prisma.ecommerceOrder.count()
        ]);
        return { items, total };
    }
    const all = memory_1.ecommerceOrders.filter(o => o.tenantId === tenantId);
    const total = all.length;
    const items = all.slice().reverse().slice(offset, offset + limit);
    return { items, total };
}
async function createOrder(params, prisma) {
    const currency = params.currency || 'GNF';
    const total = params.items.reduce((s, it) => s + it.price * it.quantity, 0);
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
        });
        // Audit log (best-effort)
        try {
            await prisma.auditLog.create({ data: { action: 'order.create', resource: 'ecommerce.order', resourceId: created.id, metadata: { total, currency }, createdAt: new Date() } });
        }
        catch { }
        return created;
    }
    const order = {
        id: `eco-${Date.now()}`,
        tenantId: params.tenantId,
        items: params.items.map(it => ({ sku: it.sku, quantity: it.quantity, price: it.price, currency })),
        total,
        currency,
        status: 'received',
        createdAt: new Date().toISOString(),
        customerEmail: params.customerEmail,
        customerPhone: params.customerPhone
    };
    memory_1.ecommerceOrders.push(order);
    return order;
}
async function updateOrderStatus(orderId, status, prisma) {
    if (prisma?.ecommerceOrder) {
        try {
            const updated = await prisma.ecommerceOrder.update({ where: { id: orderId }, data: { status } });
            try {
                await prisma.auditLog.create({ data: { action: 'order.status.update', resource: 'ecommerce.order', resourceId: orderId, metadata: { status }, createdAt: new Date() } });
            }
            catch { }
            return updated;
        }
        catch {
            return null;
        }
    }
    const idx = memory_1.ecommerceOrders.findIndex(o => o.id === orderId);
    if (idx === -1)
        return null;
    memory_1.ecommerceOrders[idx] = { ...memory_1.ecommerceOrders[idx], status };
    return memory_1.ecommerceOrders[idx];
}
async function getTodayOnlineKPIs(tenantId, prisma) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    if (prisma?.ecommerceOrder) {
        const [items, paidItems] = await Promise.all([
            prisma.ecommerceOrder.findMany({ where: { createdAt: { gte: start, lt: end } }, select: { total: true } }),
            prisma.ecommerceOrder.findMany({ where: { createdAt: { gte: start, lt: end }, paymentStatus: 'paid' }, select: { total: true } })
        ]);
        const onlineCount = items.length;
        const onlineRevenue = items.reduce((s, o) => s + Number(o.total || 0), 0);
        const paidCount = paidItems.length;
        const paidRevenue = paidItems.reduce((s, o) => s + Number(o.total || 0), 0);
        const averageOrderValuePaid = paidCount > 0 ? paidRevenue / paidCount : 0;
        return { onlineCount, onlineRevenue, paidCount, averageOrderValuePaid };
    }
    const todays = memory_1.ecommerceOrders.filter(o => new Date(o.createdAt).getTime() >= start.getTime() && new Date(o.createdAt).getTime() < end.getTime());
    const onlineCount = todays.length;
    const onlineRevenue = todays.reduce((s, o) => s + (o.total || 0), 0);
    const paidCount = 0;
    const averageOrderValuePaid = 0;
    return { onlineCount, onlineRevenue, paidCount, averageOrderValuePaid };
}
