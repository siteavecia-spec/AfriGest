export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

// Simple in-memory cache for signed media URLs
// Key: original path; Value: { url, exp } where exp is epoch ms when entry expires
const signedUrlCache = new Map<string, { url: string; exp: number }>()
function getCachedSignedUrl(path: string): string | null {
  const now = Date.now()
  const hit = signedUrlCache.get(path)
  if (hit && hit.exp > now) return hit.url
  if (hit && hit.exp <= now) signedUrlCache.delete(path)
  return null
}

// Update product basic fields
export async function updateProduct(id: string, data: { name?: string; price?: number; cost?: number; barcode?: string; taxRate?: number; sector?: string; attrs?: Record<string, any> }) {
  const res = await fetch(`${API_URL}/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to update product')
  return res.json()
}

// --- Boutiques ---
export async function listBoutiques() {
  const res = await fetch(`${API_URL}/boutiques`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to load boutiques')
  return res.json() as Promise<Array<{ id: string; name: string; code: string; address?: string; city?: string; country?: string }>>
}

export async function createBoutique(data: { name: string; code: string; address?: string; city?: string; country?: string }) {
  const res = await fetch(`${API_URL}/boutiques`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) })
  if (!res.ok) throw new Error(await res.text() || 'Failed to create boutique')
  return res.json() as Promise<{ id: string; name: string; code: string }>
}

// --- Restock Requests (MVP in-memory) ---
export async function listRestockRequests() {
  const res = await fetch(`${API_URL}/restock`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to load restock requests')
  return res.json() as Promise<Array<{ id: string; boutiqueId: string; productId: string; quantity: number; status: string; createdAt: string }>>
}

export async function createRestockRequest(data: { boutiqueId: string; productId: string; quantity: number }) {
  const res = await fetch(`${API_URL}/restock`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) })
  if (!res.ok) throw new Error(await res.text() || 'Failed to create restock request')
  return res.json() as Promise<{ id: string; status: string }>
}

export async function approveRestockRequest(id: string) {
  const res = await fetch(`${API_URL}/restock/${encodeURIComponent(id)}/approve`, { method: 'PATCH', headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to approve restock request')
  return res.json() as Promise<{ id: string; status: string }>
}

export async function rejectRestockRequest(id: string) {
  const res = await fetch(`${API_URL}/restock/${encodeURIComponent(id)}/reject`, { method: 'PATCH', headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to reject restock request')
  return res.json() as Promise<{ id: string; status: string }>
}

export async function fulfillRestockRequest(id: string) {
  const res = await fetch(`${API_URL}/restock/${encodeURIComponent(id)}/fulfill`, { method: 'PATCH', headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to fulfill restock request')
  return res.json() as Promise<{ id: string; status: string }>
}

// Alerts digest
export async function sendAlertsDigest(params?: { days?: number; sector?: string; to?: string }) {
  const q = new URLSearchParams()
  if (params?.days != null) q.set('days', String(params.days))
  if (params?.sector) q.set('sector', params.sector)
  if (params?.to) q.set('to', params.to)
  const res = await fetch(`${API_URL}/alerts/digest?${q.toString()}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to send alerts digest')
  return res.json() as Promise<{ ok: boolean; total: number; preview: string[] }>
}
function setCachedSignedUrl(path: string, url: string, ttlSec: number) {
  const exp = Date.now() + Math.max(30_000, ttlSec * 1000 - 10_000) // subtract 10s safety, min 30s
  signedUrlCache.set(path, { url, exp })
}

export function getTenantId(): string {
  // Prefer explicit tenantId, fallback to company code (used by backend tenantResolver), else 'demo'
  const tenant = (typeof window !== 'undefined' ? localStorage.getItem('afrigest_tenantId') : null) || ''
  if (tenant) return tenant
  const company = (typeof window !== 'undefined' ? localStorage.getItem('afrigest_company') : null) || ''
  return company || 'demo'
}

export async function ecomSetProductCover(sku: string, url: string) {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/products/${encodeURIComponent(sku)}/images/cover`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to set product cover image')
  return res.json() as Promise<{ ok: true; images: string[] }>
}

// Incremental image ops
export async function ecomAddProductImage(sku: string, url: string) {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/products/${encodeURIComponent(sku)}/images/add`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to add product image')
  return res.json() as Promise<{ ok: true; images: string[] }>
}

export async function ecomRemoveProductImage(sku: string, url: string) {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/products/${encodeURIComponent(sku)}/images/remove`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to remove product image')
  return res.json() as Promise<{ ok: true; images: string[] }>
}

// Create/Update ecommerce product (back-office)
export async function ecomUpsertProduct(payload: {
  sku: string
  title: string
  description?: string
  price: number
  currency?: string
  images?: string[]
  variants?: Array<Record<string, any>>
  isOnlineAvailable?: boolean
  onlineStockMode?: 'shared' | 'dedicated'
  onlineStockQty?: number
}) {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to upsert ecommerce product')
  return res.json() as Promise<{ id: string; sku: string }>
}

// --- E-COMMERCE CLIENT HELPERS ---
export async function ecomListProducts() {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/products`)
  if (!res.ok) throw new Error(await res.text() || 'Failed to load ecommerce products')
  return res.json() as Promise<{ items: Array<{ sku: string; title: string; price: number; currency: string; isOnlineAvailable: boolean }>, tenantId: string }>
}

// Get a short-lived signed URL for a private media key under the tenant namespace (with small cache)
export async function ecomGetSignedMediaUrl(path: string) {
  const cached = getCachedSignedUrl(path)
  if (cached) return { url: cached, expiresIn: 0 }
  const tenantId = getTenantId()
  const q = new URLSearchParams({ path })
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/media/signed-url?${q.toString()}`)
  if (!res.ok) throw new Error(await res.text() || 'Failed to sign media URL')
  const { url, expiresIn } = await res.json() as { url: string; expiresIn: number }
  setCachedSignedUrl(path, url, expiresIn)
  return { url, expiresIn }
}

export async function ecomListOrders() {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/orders`)
  if (!res.ok) throw new Error(await res.text() || 'Failed to load ecommerce orders')
  return res.json() as Promise<{ items: Array<{ id: string; status: string; total: number; currency: string }>, tenantId: string }>
}

export async function ecomCreateOrder(payload: { items: Array<{ sku: string; quantity: number; price: number; currency?: string }>; customer?: { email?: string; phone?: string; firstName?: string; lastName?: string }; payment?: { provider: 'stripe' | 'paypal' | 'mtn_momo' | 'orange_momo' | 'cod' } }) {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to create ecommerce order')
  return res.json() as Promise<{ id?: string; orderId?: string; payment?: { provider: string; clientSecret?: string } }>
}

export async function ecomListCustomers() {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/customers`)
  if (!res.ok) throw new Error(await res.text() || 'Failed to load ecommerce customers')
  return res.json() as Promise<{ items: Array<{ id?: string; email?: string; phone?: string; firstName?: string; lastName?: string }>, tenantId: string }>
}

export async function ecomCreateCustomer(payload: { email?: string; phone?: string; firstName?: string; lastName?: string }) {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to create ecommerce customer')
  return res.json() as Promise<{ id: string; email?: string; phone?: string; firstName?: string; lastName?: string }>
}

export async function ecomUpdateOrderStatus(orderId: string, status: 'received'|'prepared'|'shipped'|'delivered'|'returned') {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/orders/${encodeURIComponent(orderId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to update order status')
  return res.json() as Promise<{ id: string; status: string }>
}

export async function ecomSyncInventory(changes: Array<{ sku: string; delta: number; reason?: string }>) {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/sync-inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changes })
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to sync inventory')
  return res.json() as Promise<{ ok: true; tenantId: string; applied: number }>
}

export async function ecomGetSummary() {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/summary`)
  if (!res.ok) throw new Error(await res.text() || 'Failed to load ecommerce summary')
  return res.json() as Promise<{ tenantId: string; today: { onlineCount: number; onlineRevenue: number; conversionRate: number } }>
}

// E-commerce overview for a given period
export async function ecomGetOverview(from: string, to: string) {
  const tenantId = getTenantId()
  const q = new URLSearchParams({ from, to })
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/overview?${q.toString()}`)
  if (!res.ok) throw new Error(await res.text() || 'Failed to load ecommerce overview')
  return res.json() as Promise<{
    from: string
    to: string
    periodTotals: { count: number; revenue: number; payments: Record<string, number> }
    dailySeries: Array<{ date: string; count: number; revenue: number }>
    topProducts: Array<{ sku: string; quantity: number; revenue: number }>
  }>
}

// Presign S3 upload for ecommerce assets
export async function ecomPresignUpload(filename: string, contentType: string) {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/uploads/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, contentType })
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to presign upload')
  return res.json() as Promise<{ signedUrl: string; key: string; url: string; bucket: string }>
}

// --- E-COMMERCE PAYMENTS (stubs and flows) ---
export async function ecomPaymentsStripeIntent(payload: { items: Array<{ sku: string; quantity: number; price: number; currency?: string }>; customer?: { email?: string; phone?: string } }) {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/payments/stripe/intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to init Stripe intent')
  return res.json() as Promise<{ provider: 'stripe'; status?: string; clientSecret?: string; message?: string }>
}

export async function ecomPaymentsPayPalOrder(payload: { items: Array<{ sku: string; quantity: number; price: number; currency?: string }> }) {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/payments/paypal/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to init PayPal order')
  return res.json() as Promise<{ provider: 'paypal'; status?: string; id?: string; approveUrl?: string; message?: string }>
}

export async function ecomPaymentsMtnInit(payload: { amount: number; currency?: string; phone?: string }) {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/payments/mtn/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to init MTN MoMo')
  return res.json() as Promise<{ provider: 'mtn_momo'; status?: string; message?: string }>
}

export async function ecomPaymentsOrangeInit(payload: { amount: number; currency?: string; phone?: string }) {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/payments/orange/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to init Orange MoMo')
  return res.json() as Promise<{ provider: 'orange_momo'; status?: string; message?: string }>
}

export interface LoginPayload {
  email: string
  password: string
  company: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  role: 'super_admin' | 'pdg' | 'dg' | 'employee'
}

function authHeaders() {
  const token = localStorage.getItem('afrigest_token')
  const company = localStorage.getItem('afrigest_company')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (company) headers['x-company'] = company
  const email = localStorage.getItem('afrigest_email')
  if (email) headers['x-user-email'] = email
  return headers
}

async function authFetch(input: RequestInfo | URL, init?: RequestInit & { retrying?: boolean; retryCount?: number }): Promise<Response> {
  const headers = { ...(init?.headers || {}), ...authHeaders() }

  // Helper: small delay for backoff
  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

  let res: Response
  try {
    res = await fetch(input, { ...init, headers })
  } catch (err) {
    // Network error: retry up to 2 times with backoff
    const retryCount = (init as any)?.retryCount ?? 0
    if (retryCount < 2) {
      const delay = 200 * Math.pow(2, retryCount)
      await sleep(delay)
      return authFetch(input, { ...(init as any), headers, retrying: true, retryCount: retryCount + 1 })
    }
    throw err
  }

  // Handle non-401 responses first
  if (res.status !== 401 || init?.retrying) {
    // Backoff for 429 and selected 5xx
    if ((res.status === 429 || res.status === 502 || res.status === 503 || res.status === 504)) {
      const retryCount = (init as any)?.retryCount ?? 0
      if (retryCount < 2) {
        const delay = 200 * Math.pow(2, retryCount)
        // Respect Retry-After if present
        const ra = Number(res.headers.get('Retry-After') || '')
        const extra = Number.isFinite(ra) ? Math.max(delay, ra * 1000) : delay
        await sleep(extra)
        return authFetch(input, { ...(init as any), headers, retrying: true, retryCount: retryCount + 1 })
      }
    }
    if (!res.ok) {
      const rid = res.headers.get('X-Request-Id') || ''
      const txt = await res.text()
      const msg = (txt || 'Request failed') + (rid ? ` (ReqID: ${rid})` : '')
      throw new Error(msg)
    }
    return res
  }

  // 401 handling with refresh flow
  const refresh = localStorage.getItem('afrigest_refresh')
  const company = localStorage.getItem('afrigest_company')
  if (!refresh) return res
  const r = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(company ? { 'x-company': company } : {}) },
    body: JSON.stringify({ refreshToken: refresh })
  })
  if (!r.ok) return res
  const json = await r.json() as { accessToken: string; refreshToken: string }
  localStorage.setItem('afrigest_token', json.accessToken)
  localStorage.setItem('afrigest_refresh', json.refreshToken)
  const retryHeaders = { ...(init?.headers || {}), ...authHeaders() }
  const retried = await (fetch as any)(input, { ...(init as any), headers: retryHeaders, retrying: true })
  if (!retried.ok) {
    const rid = retried.headers.get('X-Request-Id') || ''
    const txt = await retried.text()
    const msg = (txt || 'Request failed') + (rid ? ` (ReqID: ${rid})` : '')
    throw new Error(msg)
  }
  return retried
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(await res.text() || 'Login failed')
  return res.json()
}

// Forgot/Reset Password flows
export async function forgotPassword(email: string, captcha?: string) {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, method: 'email', captcha })
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to request password reset')
  return res.json() as Promise<{ ok: true }>
}

export async function forgotPasswordSms(phone: string, captcha?: string) {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, method: 'sms', captcha })
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to request SMS reset')
  return res.json() as Promise<{ ok: true; otpSent: true }>
}

export async function validateOtp(phone: string, otp: string) {
  const res = await fetch(`${API_URL}/auth/validate-reset-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp })
  })
  if (!res.ok) throw new Error(await res.text() || 'Invalid OTP')
  return res.json() as Promise<{ ok: true; email: string; token: string }>
}

export async function validateResetToken(token: string) {
  const res = await fetch(`${API_URL}/auth/validate-reset-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  })
  if (!res.ok) throw new Error(await res.text() || 'Invalid or expired token')
  return res.json() as Promise<{ ok: true; email: string }>
}

export async function resetPasswordWithToken(token: string, newPassword: string, confirmPassword: string) {
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword, confirmPassword })
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to reset password')
  return res.json() as Promise<{ ok: true; email: string }>
}

// Email verification
export async function verifyEmail(token: string) {
  const res = await fetch(`${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`)
  if (!res.ok) throw new Error((await res.text()) || 'Invalid or expired token')
  return res.json() as Promise<{ ok: true }>
}

// Resend verification email
export async function resendVerificationEmail(email: string) {
  const res = await fetch(`${API_URL}/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to resend verification email')
  return res.json() as Promise<{ ok: true }>
}

// Referrals (ambassador)
export async function getReferralCode() {
  const res = await authFetch(`${API_URL}/referrals/code`)
  if (!res.ok) throw new Error(await res.text() || 'Failed to load referral code')
  return res.json() as Promise<{ code: string; company: string }>
}

export async function generateReferralCode() {
  const res = await authFetch(`${API_URL}/referrals/generate`, { method: 'POST' })
  if (!res.ok) throw new Error(await res.text() || 'Failed to generate referral code')
  return res.json() as Promise<{ code: string; company: string }>
}

export async function getReferralStats() {
  const res = await authFetch(`${API_URL}/referrals/stats`)
  if (!res.ok) throw new Error(await res.text() || 'Failed to load referral stats')
  return res.json() as Promise<{ totalLeads: number; leadsThisMonth: number }>
}

export async function getReferralRequests() {
  const res = await authFetch(`${API_URL}/referrals/leads`)
  if (!res.ok) throw new Error(await res.text() || 'Failed to load referral requests')
  return res.json() as Promise<Array<{ id?: string; name?: string; company?: string; email?: string; phone?: string; referralCode?: string; createdAt: string }>>
}

// Public validation for referral code on landing page
export async function validateReferralPublic(code: string) {
  const res = await fetch(`${API_URL}/public/referrals/validate?code=${encodeURIComponent(code)}`)
  if (!res.ok) return { ok: false } as { ok: boolean }
  return res.json() as Promise<{ ok: boolean; owner?: string | null }>
}

// Admin (stubs)
export async function adminListReferralRequests(params?: { status?: 'pending' | 'approved' | 'rejected'; limit?: number; offset?: number }) {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.limit != null) q.set('limit', String(params.limit))
  if (params?.offset != null) q.set('offset', String(params.offset))
  const res = await authFetch(`${API_URL}/referrals/admin/requests?${q.toString()}`)
  if (!res.ok) throw new Error(await res.text() || 'Failed to load referral requests (admin)')
  return res.json() as Promise<{ items: any[]; total: number; limit: number; offset: number; status: string }>
}

export async function adminValidateReferralReward(id: string) {
  const res = await authFetch(`${API_URL}/referrals/admin/rewards/validate/${encodeURIComponent(id)}`, { method: 'POST' })
  if (!res.ok) throw new Error(await res.text() || 'Failed to validate referral reward')
  return res.json() as Promise<{ ok: true; id: string }>
}

export async function adminMarkRewardPaid(id: string) {
  const res = await authFetch(`${API_URL}/referrals/admin/rewards/pay/${encodeURIComponent(id)}`, { method: 'POST' })
  if (!res.ok) throw new Error(await res.text() || 'Failed to mark reward as paid')
  return res.json() as Promise<{ ok: true; id: string }>
}

// --- SUPER ADMIN: Companies (Master DB) ---
export async function adminListCompanies(params?: { status?: 'active'|'pending'|'archived'; limit?: number; offset?: number }) {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.limit != null) q.set('limit', String(params.limit))
  if (params?.offset != null) q.set('offset', String(params.offset))
  const res = await authFetch(`${API_URL}/admin/companies?${q.toString()}`)
  if (!res.ok) throw new Error(await res.text() || 'Failed to list companies')
  return res.json() as Promise<{ items: Array<{ id: string; code: string; name: string; contactEmail?: string; status: string; createdAt: string; subdomain?: string|null; plan?: string }>; total: number; limit: number; offset: number }>
}

export async function adminCreateCompany(payload: { code: string; name: string; contactEmail?: string; subdomain?: string; plan?: string }) {
  const res = await authFetch(`${API_URL}/admin/companies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) throw new Error(await res.text() || 'Failed to create company')
  return res.json() as Promise<{ id: string; code: string; name: string; contactEmail?: string; status: string; createdAt: string; subdomain?: string|null; plan?: string }>
}

export async function adminUpdateCompany(id: string, payload: { name?: string; contactEmail?: string; status?: 'active'|'pending'|'archived'; subdomain?: string; plan?: string }) {
  const res = await authFetch(`${API_URL}/admin/companies/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  if (!res.ok) throw new Error(await res.text() || 'Failed to update company')
  return res.json() as Promise<{ id: string; code: string; name: string; contactEmail?: string; status: string; createdAt: string; subdomain?: string|null; plan?: string }>
}

export async function adminArchiveCompany(id: string) {
  const res = await authFetch(`${API_URL}/admin/companies/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error(await res.text() || 'Failed to archive company')
  return { ok: true }
}

export async function adminImpersonate(companyCode: string) {
  const res = await authFetch(`${API_URL}/admin/impersonate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyCode }) })
  if (!res.ok) throw new Error(await res.text() || 'Failed to impersonate')
  return res.json() as Promise<{ ok: true; company: string; expiresIn: number }>
}

export async function adminProvisionCompany(id: string) {
  const res = await authFetch(`${API_URL}/admin/companies/${encodeURIComponent(id)}/provision`, { method: 'POST' })
  if (!res.ok) throw new Error(await res.text() || 'Failed to provision company')
  return res.json() as Promise<{ ok: true; id: string; status: string }>
}

// Products
export async function listProducts(limit?: number, offset?: number) {
  const q = new URLSearchParams()
  if (limit != null) q.set('limit', String(limit))
  if (offset != null) q.set('offset', String(offset))
  const qs = q.toString()
  const url = `${API_URL}/products${qs ? `?${qs}` : ''}`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to load products')
  return res.json()
}

// Paged variant with total (reads X-Total-Count)
export async function listProductsPaged(limit = 100, offset = 0) {
  const q = new URLSearchParams()
  q.set('limit', String(limit))
  q.set('offset', String(offset))
  const url = `${API_URL}/products?${q.toString()}`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to load products')
  const totalHeader = res.headers.get('X-Total-Count')
  const total = totalHeader ? Number(totalHeader) : undefined
  const items = await res.json()
  return { items, total: total ?? (Array.isArray(items) ? items.length : 0) }
}

export async function createProduct(data: { sku: string; name: string; price: number; cost: number; barcode?: string; taxRate?: number; sector?: string; attrs?: Record<string, any> }) {
  const res = await fetch(`${API_URL}/products`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to create product')
  return res.json()
}

export async function listProductTemplates() {
  const res = await fetch(`${API_URL}/products/templates`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to load product templates')
  return res.json() as Promise<Array<{ key: string; name: string; attributes: Array<{ key: string; label: string; type: 'string' | 'number' | 'date' | 'text' }> }>>
}

// Add/remove PDG custom attributes (persisted server-side)
export async function addCustomProductAttribute(data: { sectorKey: string; key: string; label: string; type: 'string'|'number'|'date'|'text'; required?: boolean }) {
  const res = await fetch(`${API_URL}/products/templates/custom`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to add custom attribute')
  return res.json() as Promise<{ id: string; sectorKey: string; key: string; label: string; type: 'string'|'number'|'date'|'text'; required: boolean }>
}

export async function removeCustomProductAttribute(sectorKey: string, key: string) {
  const res = await fetch(`${API_URL}/products/templates/custom`, {
    method: 'DELETE',
    headers: authHeaders(),
    body: JSON.stringify({ sectorKey, key })
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to remove custom attribute')
  return res.json()
}

// Export products CSV for a given sector (or 'all')
export async function exportProductsCsv(sector: string = 'all') {
  const q = new URLSearchParams()
  if (sector) q.set('sector', sector)
  const res = await fetch(`${API_URL}/products/export?${q.toString()}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to export products')
  return res.text() // CSV content
}

// Import products JSON for a given sector
export async function importProductsJson(sectorKey: string, items: Array<Record<string, any>>) {
  const res = await fetch(`${API_URL}/products/import`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ sectorKey, items })
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to import products')
  return res.json() as Promise<{ createdCount: number; errorCount: number; created: any[]; errors: any[] }>
}

// Advanced search (MVP server-filtered)
export async function searchProducts(params: { q?: string; sector?: string; expiryBefore?: string; warrantyLtDays?: number; attrs?: Record<string, string | number> }) {
  const qsp = new URLSearchParams()
  if (params.q) qsp.set('q', params.q)
  if (params.sector) qsp.set('sector', params.sector)
  if (params.expiryBefore) qsp.set('expiryBefore', params.expiryBefore)
  if (params.warrantyLtDays != null) qsp.set('warrantyLtDays', String(params.warrantyLtDays))
  if (params.attrs) {
    Object.entries(params.attrs).forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).trim() !== '') qsp.set(`attr.${k}`, String(v))
    })
  }
  const res = await fetch(`${API_URL}/products/search?${qsp.toString()}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to search products')
  return res.json() as Promise<{ items: Array<{ id: string; sku: string; name: string; attrs?: Record<string, any>; sector?: string }> }>
}

// Suppliers
export async function listSuppliers(limit?: number, offset?: number) {
  const q = new URLSearchParams()
  if (limit != null) q.set('limit', String(limit))
  if (offset != null) q.set('offset', String(offset))
  const qs = q.toString()
  const url = `${API_URL}/suppliers${qs ? `?${qs}` : ''}`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to load suppliers')
  return res.json()
}

// Paged variant with total (reads X-Total-Count)
export async function listSuppliersPaged(limit = 50, offset = 0) {
  const q = new URLSearchParams()
  q.set('limit', String(limit))
  q.set('offset', String(offset))
  const url = `${API_URL}/suppliers?${q.toString()}`
  const res = await fetch(url, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to load suppliers')
  const totalHeader = res.headers.get('X-Total-Count')
  const total = totalHeader ? Number(totalHeader) : undefined
  const items = await res.json()
  return { items, total: total ?? (Array.isArray(items) ? items.length : 0) }
}

// Stock
export async function getStockSummary(boutiqueId: string) {
  const res = await fetch(`${API_URL}/stock/summary?boutiqueId=${encodeURIComponent(boutiqueId)}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to load stock summary')
  return res.json() as Promise<{ boutiqueId: string; summary: Array<{ productId: string; sku: string; name: string; quantity: number }> }>
}

export async function createStockEntry(data: { boutiqueId: string; reference?: string; items: Array<{ productId: string; quantity: number; unitCost: number }> }) {
  const res = await fetch(`${API_URL}/stock/entries`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to create stock entry')
  return res.json()
}

// Sales
export async function createSale(data: { boutiqueId: string; items: Array<{ productId: string; quantity: number; unitPrice: number; discount?: number }>; paymentMethod: 'cash'|'mobile_money'|'card'|'mixed'; payments?: Array<{ method: 'cash'|'mobile_money'|'card'; amount: number; ref?: string }>; currency?: string; offlineId?: string }) {
  const res = await fetch(`${API_URL}/sales`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to create sale')
  return res.json()
}

// --- Transfers (MVP in-memory) ---
export async function createTransfer(payload: { sourceBoutiqueId: string; destBoutiqueId: string; reference?: string; items: Array<{ productId: string; quantity: number }> }) {
  const res = await fetch(`${API_URL}/transfers`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) })
  if (!res.ok) throw new Error(await res.text() || 'Failed to create transfer')
  return res.json() as Promise<{ id: string; status: string; token: string }>
}

export async function listTransfers() {
  const res = await fetch(`${API_URL}/transfers`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to load transfers')
  return res.json() as Promise<Array<{ id: string; sourceBoutiqueId: string; destBoutiqueId: string; status: string; reference?: string; token: string; createdAt: string }>>
}

export async function sendTransfer(id: string) {
  const res = await fetch(`${API_URL}/transfers/${encodeURIComponent(id)}/send`, { method: 'POST', headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to send transfer')
  return res.json() as Promise<{ ok: true; id: string; status: string }>
}

export async function receiveTransfer(id: string) {
  const res = await fetch(`${API_URL}/transfers/${encodeURIComponent(id)}/receive`, { method: 'POST', headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to receive transfer')
  return res.json() as Promise<{ ok: true; id: string; status: string }>
}

// Stock adjustments
export async function adjustStock(data: { boutiqueId: string; productId: string; delta: number; reason: string }) {
  const res = await fetch(`${API_URL}/stock/adjust`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to adjust stock')
  return res.json() as Promise<{ ok: true; quantity: number }>
}

export async function getStockAudit(productId: string, limit = 20) {
  const res = await fetch(`${API_URL}/stock/audit?productId=${encodeURIComponent(productId)}&limit=${limit}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to load stock audit')
  return res.json() as Promise<Array<{ id: string; productId: string; boutiqueId: string; delta: number; reason: string; userId?: string; createdAt: string }>>
}

// Inventory (MVP)
export async function getInventorySummary(boutiqueId: string) {
  const res = await fetch(`${API_URL}/inventory/summary?boutiqueId=${encodeURIComponent(boutiqueId)}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to load inventory summary')
  return res.json() as Promise<{ boutiqueId: string; summary: Array<{ productId: string; sku?: string; name?: string; quantity: number }> }>
}

export async function createInventorySession(payload: { boutiqueId: string; items: Array<{ productId: string; counted: number; unitPrice?: number }> }) {
  const res = await fetch(`${API_URL}/inventory/sessions`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) })
  if (!res.ok) throw new Error(await res.text() || 'Failed to create inventory session')
  return res.json() as Promise<{ id: string; boutiqueId: string; createdAt: string; items: Array<{ productId: string; expected: number; counted: number; delta: number; unitPrice?: number; valueDelta?: number }>; totalDelta: number; totalValueDelta: number }>
}

// Alerts (métier-specific)
export async function listAlerts(params?: { days?: number; sector?: string }) {
  const q = new URLSearchParams()
  if (params?.days != null) q.set('days', String(params.days))
  if (params?.sector) q.set('sector', params.sector)
  const res = await fetch(`${API_URL}/alerts?${q.toString()}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to load alerts')
  return res.json() as Promise<{ expired: any[]; expiringSoon: any[]; warrantyExpiring: any[] }>
}

// Sales summary (KPIs)
export async function getSalesSummary(boutiqueId?: string) {
  const q = boutiqueId ? `?boutiqueId=${encodeURIComponent(boutiqueId)}` : ''
  const res = await fetch(`${API_URL}/sales/summary${q}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to load sales summary')
  return res.json() as Promise<{ today: { count: number; total: number }, topProduct?: { productId: string; sku?: string; name?: string; quantity: number; total: number } | null }>
}

// Sales listing (for CSV export / QA)
export async function listSales(limit = 500, offset = 0) {
  const res = await fetch(`${API_URL}/sales?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to load sales')
  return res.json() as Promise<Array<{ id: string; boutiqueId: string; items: Array<{ productId: string; quantity: number; unitPrice: number; discount?: number }>; total: number; paymentMethod: string; currency: string; createdAt: string }>>
}

// Paged variant with total (reads X-Total-Count)
export async function listSalesPaged(limit = 100, offset = 0) {
  const res = await fetch(`${API_URL}/sales?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to load sales')
  const totalHeader = res.headers.get('X-Total-Count')
  const total = totalHeader ? Number(totalHeader) : undefined
  const items = await res.json()
  return { items, total: total ?? (Array.isArray(items) ? items.length : 0) }
}

// Public landing
export async function getTopClientsPublic() {
  const res = await fetch(`${API_URL}/public/clients-top`)
  if (!res.ok) throw new Error(await res.text() || 'Failed to load clients')
  return res.json() as Promise<Array<{ id: string; name: string; sector: string; logoUrl?: string }>>
}

export async function createDemoRequestPublic(data: { name: string; company: string; email: string; phone?: string; message?: string; captcha?: string }) {
  const res = await fetch(`${API_URL}/public/demo-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to submit demo request')
  return res.json()
}

// (duplicates removed below — earlier definitions maintained)

export async function getReferralLeads() {
  const res = await fetch(`${API_URL}/referrals/leads`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to load referral leads')
  return res.json() as Promise<Array<{ id: string; name: string; company: string; email: string; phone?: string; message?: string; referralCode?: string; createdAt: string }>>
}

// Leads (Super Admin)
export async function listLeads() {
  const res = await authFetch(`${API_URL}/leads`)
  if (!res.ok) throw new Error(await res.text() || 'Failed to load leads')
  return res.json() as Promise<Array<{ id: string; name: string; company: string; email: string; phone?: string; message?: string; referralCode?: string; createdAt: string; contacted?: boolean; notes?: string; contactedAt?: string; updatedAt?: string }>>
}

export async function updateLead(id: string, data: { contacted?: boolean; notes?: string }) {
  const headers = authHeaders()
  const userName = (typeof window !== 'undefined' ? localStorage.getItem('afrigest_user_name') : null) || ''
  if (userName) (headers as any)['x-user-name'] = userName
  const res = await fetch(`${API_URL}/leads/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to update lead')
  return res.json() as Promise<{ id: string; contacted?: boolean; notes?: string }>
}

// Super Admin: force password reset for a user
export async function forcePasswordReset(email: string, reason: string) {
  const res = await fetch(`${API_URL}/super-admin/force-password-reset`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, reason })
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to force password reset')
  return res.json() as Promise<{ ok: true }>
}

// Users (Admin)
export interface UserItem { id: string; email: string; fullName: string; role: 'super_admin' | 'pdg' | 'dg' | 'employee'; status: 'active' | 'disabled'; lastLoginAt?: string | null }

export async function listUsers(params?: { query?: string; limit?: number; offset?: number }) {
  const q = new URLSearchParams()
  if (params?.query) q.set('query', params.query)
  if (params?.limit != null) q.set('limit', String(params.limit))
  if (params?.offset != null) q.set('offset', String(params.offset))
  const res = await authFetch(`${API_URL}/users?${q.toString()}`)
  if (!res.ok) throw new Error(await res.text() || 'Failed to load users')
  return res.json() as Promise<{ items: UserItem[]; total: number; limit: number; offset: number }>
}

export async function getUser(id: string) {
  const res = await authFetch(`${API_URL}/users/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(await res.text() || 'Failed to load user')
  return res.json() as Promise<UserItem & { phone?: string }>
}

export async function createUser(data: { email: string; password: string; fullName: string; role: 'super_admin' | 'pdg' | 'dg' | 'employee' }) {
  const res = await authFetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to create user')
  return res.json() as Promise<UserItem>
}

export async function updateUser(id: string, data: { fullName?: string; role?: 'super_admin' | 'pdg' | 'dg' | 'employee'; status?: 'active' | 'disabled'; password?: string }) {
  const res = await authFetch(`${API_URL}/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to update user')
  return res.json() as Promise<UserItem>
}

export async function deactivateUser(id: string) {
  const res = await authFetch(`${API_URL}/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to deactivate user')
  return res.json() as Promise<{ ok: true }>
}

export async function logoutApi() {
  const refresh = localStorage.getItem('afrigest_refresh')
  const company = localStorage.getItem('afrigest_company')
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(company ? { 'x-company': company } : {}) },
      body: JSON.stringify({ refreshToken: refresh || undefined })
    })
  } catch {}
}

// --- Dev utilities (Phase 1 QA) ---
export async function devSeedBasic() {
  const res = await fetch(`${API_URL}/dev/seed/basic`, { method: 'POST', headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to seed basic data')
  return res.json() as Promise<{ ok: true; applied: Array<{ productId: string; sku: string; qty: number }> }>
}

export async function devSeedSales() {
  const res = await fetch(`${API_URL}/dev/seed/sales`, { method: 'POST', headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to seed demo sales')
  return res.json() as Promise<{ ok: true; created: Array<{ id: string; total: number }> }>
}

export async function devGetStatus() {
  const res = await fetch(`${API_URL}/dev/status`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to load dev status')
  return res.json() as Promise<{ ok: true; counts: { products: number; suppliers: number; sales: number; stockAudits: number; lowAlerts: number } }>
}
