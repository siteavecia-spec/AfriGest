import { PrismaClient } from '@prisma/client'

export type EcommerceProduct = {
  sku: string
  title: string
  description?: string
  price: number
  currency: string
  images: string[]
  variants: Array<Record<string, any>>
  isOnlineAvailable: boolean
  onlineStockMode: 'shared' | 'dedicated'
  onlineStockQty?: number
}

// Map internal product rows to ecommerce representation
export async function listEcommerceProducts(prisma: PrismaClient, tenantId: string): Promise<EcommerceProduct[]> {
  // Assumptions: internal model has product with fields: sku, name, price, attrs, isActive
  // Adjust mapping once the real schema is finalized.
  const rows: any[] = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  })
  return rows.map(r => ({
    sku: r.sku || r.id,
    title: r.name,
    description: r.attrs?.description ?? undefined,
    price: Number(r.price ?? 0),
    currency: r.attrs?.currency ?? 'GNF',
    images: Array.isArray(r.attrs?.images) ? r.attrs.images : [],
    variants: Array.isArray(r.attrs?.variants) ? r.attrs.variants : [],
    isOnlineAvailable: r.attrs?.isOnlineAvailable ?? true,
    onlineStockMode: (r.attrs?.onlineStockMode === 'dedicated' ? 'dedicated' : 'shared'),
    onlineStockQty: typeof r.attrs?.onlineStockQty === 'number' ? r.attrs.onlineStockQty : undefined
  }))
}
