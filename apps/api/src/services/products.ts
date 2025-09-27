import { Request } from 'express'
import { products as memoryProducts, Product } from '../stores/memory'
import { getTenantClientFromReq } from '../db'

const useDb = (process.env.USE_DB || '').toLowerCase() === 'true'

export async function listProducts(req: Request, params?: { limit?: number; offset?: number }): Promise<any[]> {
  const limit = params?.limit
  const offset = params?.offset || 0
  if (useDb) {
    const prisma = getTenantClientFromReq(req)
    if (prisma) {
      try {
        const rows = await prisma.product.findMany({ orderBy: { name: 'asc' }, skip: offset || undefined, take: limit || undefined })
        return rows as any[]
      } catch (e) {
        console.warn('[products.service] Prisma fetch failed, fallback to memory:', e)
      }
    }
  }
  const data = memoryProducts.slice()
  if (offset || limit) return data.slice(offset, limit ? offset + limit : undefined)
  return data
}

export async function createProduct(req: Request, data: { sku: string; name: string; price: number; cost: number; barcode?: string; taxRate?: number; sector?: string; attrs?: Record<string, any> }): Promise<any> {
  if (useDb) {
    const prisma = getTenantClientFromReq(req)
    if (prisma) {
      try {
        const created = await prisma.product.create({ data: { ...data, isActive: true, taxRate: data.taxRate ?? 0 } as any })
        return created as any
      } catch (e) {
        console.warn('[products.service] Prisma create failed, fallback to memory:', e)
      }
    }
  }
  const id = `prod-${Date.now()}`
  const product: Product = { id, isActive: true, ...data }
  memoryProducts.push(product)
  return product
}
