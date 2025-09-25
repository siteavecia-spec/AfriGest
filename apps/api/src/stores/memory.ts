// Simple in-memory stores for MVP demo
// NOTE: This is temporary and will be replaced by Prisma-backed services.

export type ID = string

export interface Product { id: ID; sku: string; name: string; price: number; cost: number; barcode?: string; taxRate?: number; isActive: boolean; sector?: string; attrs?: Record<string, any> }
export interface Supplier { id: ID; name: string; contactName?: string; phone?: string; email?: string; address?: string }
export interface Boutique { id: ID; name: string; code: string }
export interface StockKey { boutiqueId: ID; productId: ID }
export interface StockEntryItem { productId: ID; quantity: number; unitCost: number }
export interface SaleItem { productId: ID; quantity: number; unitPrice: number; discount?: number }
export interface Sale {
  id: ID
  boutiqueId: ID
  items: SaleItem[]
  total: number
  paymentMethod: string
  currency: string
  cashierUserId?: ID
  createdAt: string
  offlineId?: string | null
}

export const products: Product[] = []
// Seed demo products for in-memory mode
products.push(
  { id: 'prod-1001', sku: 'SKU-TSHIRT', name: 'T-Shirt Coton', price: 75000, cost: 40000, barcode: '1000001', taxRate: 0, isActive: true, sector: 'fashion', attrs: { size: 'M', color: 'Bleu' } },
  { id: 'prod-1002', sku: 'SKU-SHOES', name: 'Chaussures Ville', price: 250000, cost: 150000, barcode: '1000002', taxRate: 0, isActive: true, sector: 'retail', attrs: { minStock: 3 } },
  { id: 'prod-1003', sku: 'SKU-SHAMPOO', name: 'Shampooing 250ml', price: 35000, cost: 18000, barcode: '1000003', taxRate: 0, isActive: true, sector: 'beauty', attrs: { brand: 'AfriBeauty' } }
)
export const suppliers: Supplier[] = []
export const boutiques: Boutique[] = [
  { id: 'bq-1', name: 'Boutique Principale', code: 'MAIN' }
]

// stocks map keyed by `${boutiqueId}:${productId}` -> quantity
export const stocks = new Map<string, number>()
export const sales: Sale[] = []
export interface StockAudit {
  id: ID
  productId: ID
  boutiqueId: ID
  delta: number
  reason: string
  userId?: ID
  createdAt: string
}
export const stockAudits: StockAudit[] = []

export function stockKey(boutiqueId: ID, productId: ID) {
  return `${boutiqueId}:${productId}`
}

export function upsertStock(boutiqueId: ID, productId: ID, deltaQty: number) {
  const key = stockKey(boutiqueId, productId)
  const current = stocks.get(key) ?? 0
  const next = current + deltaQty
  stocks.set(key, next)
  return next
}

export function getStock(boutiqueId: ID, productId: ID) {
  return stocks.get(stockKey(boutiqueId, productId)) ?? 0
}

// Referral (parrainage) MVP in-memory
export interface ReferralCode { code: string; owner?: string; ownerEmail?: string; isActive: boolean }
export const referralCodes: ReferralCode[] = [
  { code: 'AFG-MTX5B2', owner: 'PDG Alpha', ownerEmail: 'alpha@demo.local', isActive: true },
  { code: 'AFG-KINDIA1', owner: 'PDG Beta', ownerEmail: 'beta@demo.local', isActive: true },
]

// Sector templates (MVP in-memory)
export interface SectorAttribute { key: string; label: string; type: 'string' | 'number' | 'date' | 'text' }
export interface PublicClient { id: ID; name: string; sector: string; logoUrl?: string; score: number }
export const publicClients: PublicClient[] = [
  { id: 'cl-1', name: 'Boutique Kankan', sector: 'Retail', score: 92, logoUrl: 'https://example.com/kankan-logo.png' },
  { id: 'cl-2', name: 'Café Conakry', sector: 'Restaurant', score: 88, logoUrl: 'https://example.com/conakry-logo.png' },
  { id: 'cl-3', name: 'Pharma Labé', sector: 'Pharmacie', score: 84, logoUrl: 'https://example.com/labe-logo.png' },
  { id: 'cl-4', name: 'Mode Nzérékoré', sector: 'Mode', score: 80, logoUrl: 'https://example.com/nzerekore-logo.png' },
  { id: 'cl-5', name: 'Electro Kindia', sector: 'Électronique', score: 77, logoUrl: 'https://example.com/kindia-logo.png' },
  { id: 'cl-6', name: 'Supérette Boké', sector: 'Supérette', score: 73, logoUrl: 'https://example.com/boke-logo.png' },
]

export interface DemoRequest { id: ID; name: string; company: string; email: string; phone?: string; message?: string; referralCode?: string; createdAt: string; contacted?: boolean; notes?: string; contactedAt?: string; updatedAt?: string; updatedBy?: string }
export const demoRequests: DemoRequest[] = []

// Password reset (MVP in-memory)
export interface PasswordResetRequest {
  id: ID
  userEmail: string
  phone?: string
  resetMethod: 'email' | 'sms'
  resetToken?: string
  otpCode?: string
  expiresAt: string
  used: boolean
  ip?: string
  userAgent?: string
  createdAt: string
  updatedAt: string
}
export const passwordResetRequests: PasswordResetRequest[] = []

// After a successful password reset, record a revocation timestamp per user (by email in MVP)
// Any JWT with iat prior to this timestamp should be rejected by middleware
export const passwordRevokedAfter = new Map<string, number>()

export interface SectorTemplate { key: string; name: string; attributes: SectorAttribute[] }
export const sectorTemplates: SectorTemplate[] = [
  { key: 'retail', name: 'Commerce de détail', attributes: [
    { key: 'supplier', label: 'Fournisseur', type: 'string' },
    { key: 'ref', label: 'Référence produit', type: 'string' },
    { key: 'promoPrice', label: 'Prix promotionnel', type: 'number' },
    { key: 'minStock', label: 'Stock minimum', type: 'number' },
  ]},
  { key: 'restaurant', name: 'Restaurant / Café', attributes: [
    { key: 'ingredients', label: 'Ingrédients', type: 'text' },
    { key: 'allergens', label: 'Allergènes', type: 'text' },
    { key: 'prepTime', label: 'Temps de préparation (min)', type: 'number' },
    { key: 'bomCost', label: 'Coût matière première', type: 'number' },
  ]},
  { key: 'fashion', name: 'Boutique de mode', attributes: [
    { key: 'size', label: 'Taille', type: 'string' },
    { key: 'color', label: 'Couleur', type: 'string' },
    { key: 'material', label: 'Matière', type: 'string' },
    { key: 'season', label: 'Saison / Collection', type: 'string' },
  ]},
  { key: 'electronics', name: 'Électronique / Informatique', attributes: [
    { key: 'brand', label: 'Marque', type: 'string' },
    { key: 'model', label: 'Modèle', type: 'string' },
    { key: 'serial', label: 'Numéro de série', type: 'string' },
    { key: 'warranty', label: 'Garantie (mois)', type: 'number' },
  ]},
  { key: 'pharmacy', name: 'Pharmacie', attributes: [
    { key: 'dci', label: 'DCI', type: 'string' },
    { key: 'dosage', label: 'Dosage', type: 'string' },
    { key: 'form', label: 'Forme galénique', type: 'string' },
    { key: 'batch', label: 'Numéro de lot', type: 'string' },
    { key: 'expiry', label: 'Date d\'expiration', type: 'date' },
  ]},
  { key: 'grocery', name: 'Supérette', attributes: [
    { key: 'category', label: 'Catégorie', type: 'string' },
    { key: 'expiry', label: 'Date de péremption', type: 'date' },
    { key: 'shelfStock', label: 'Stock en rayon', type: 'number' },
    { key: 'promo', label: 'Promotion', type: 'string' },
  ]},
  { key: 'beauty', name: 'Boutique de beauté', attributes: [
    { key: 'brand', label: 'Marque', type: 'string' },
    { key: 'range', label: 'Gamme', type: 'string' },
    { key: 'keyIngredients', label: 'Ingrédients clés', type: 'text' },
    { key: 'expiry', label: 'Date d\'expiration', type: 'date' },
  ]},
  { key: 'generic', name: 'Générique', attributes: [
  ]},
]
