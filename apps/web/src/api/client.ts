export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export interface LoginPayload {
  email: string
  password: string
  company: string
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

// Super Admin: force password reset
export async function forcePasswordReset(email: string, reason: string) {
  const res = await fetch(`${API_URL}/super-admin/force-password-reset`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, reason })
  })
  return res.json() as Promise<{ ok: true }>
}

// Forgot password (MVP email flow)
export async function forgotPassword(email: string, captcha?: string) {
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, method: 'email', captcha })
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to request password reset')
  return res.json() as Promise<{ ok: true }>
}

export async function validateResetToken(token: string) {
  const res = await fetch(`${API_URL}/auth/validate-reset-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  })
  if (!res.ok) throw new Error(await res.text() || 'Invalid or expired token')
  const { ok, email } = await res.json()
  if (ok) await verifyEmail(token)
  return { ok, email }
}

// Email verification
export async function verifyEmail(token: string) {
  const res = await fetch(`${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`)
  if (!res.ok) throw new Error((await res.text()) || 'Invalid or expired token')
  return res.json() as Promise<{ ok: true }>
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || 'Login failed')
  }
  return res.json()
}

// Products
export async function listProducts() {
  const res = await fetch(`${API_URL}/products`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to load products')
  return res.json()
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

// Suppliers
export async function listSuppliers() {
  const res = await fetch(`${API_URL}/suppliers`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to load suppliers')
  return res.json()
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
export async function createSale(data: { boutiqueId: string; items: Array<{ productId: string; quantity: number; unitPrice: number; discount?: number }>; paymentMethod: string; currency?: string; offlineId?: string }) {
  const res = await fetch(`${API_URL}/sales`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to create sale')
  return res.json()
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

// Sales summary (KPIs)
export async function getSalesSummary() {
  const res = await fetch(`${API_URL}/sales/summary`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to load sales summary')
  return res.json() as Promise<{ today: { count: number; total: number }, topProduct?: { productId: string; sku?: string; name?: string; quantity: number; total: number } | null }>
}

// Public landing
export async function getTopClientsPublic() {
  const res = await fetch(`${API_URL}/public/clients-top`)
  if (!res.ok) throw new Error(await res.text() || 'Failed to load clients')
  return res.json() as Promise<Array<{ id: string; name: string; sector: string; logoUrl?: string }>>
}

export async function createDemoRequestPublic(data: { name: string; company: string; email: string; phone?: string; message?: string }) {
  const res = await fetch(`${API_URL}/public/demo-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to submit demo request')
  return res.json()
}

export async function validateReferralPublic(code: string) {
  const res = await fetch(`${API_URL}/public/referrals/validate?code=${encodeURIComponent(code)}`)
  if (!res.ok) return { ok: false }
  return res.json() as Promise<{ ok: boolean; owner?: string | null }>
}

// Referrals (protected)
export async function getReferralCode() {
  const res = await fetch(`${API_URL}/referrals/code`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to load referral code')
  return res.json() as Promise<{ code: string; company: string }>
}

export async function generateReferralCode() {
  const res = await fetch(`${API_URL}/referrals/generate`, { method: 'POST', headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to generate code')
  return res.json() as Promise<{ code: string; company: string }>
}

// Leads (protected Super Admin)
export async function listLeads() {
  const res = await fetch(`${API_URL}/leads`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to load leads')
  return res.json() as Promise<Array<{ id: string; name: string; company: string; email: string; phone?: string; message?: string; referralCode?: string; createdAt: string }>>
}

export async function getReferralStats() {
  const res = await fetch(`${API_URL}/referrals/stats`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to load referral stats')
  return res.json() as Promise<{ totalLeads: number; leadsThisMonth: number }>
}

export async function getReferralLeads() {
  const res = await fetch(`${API_URL}/referrals/leads`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await res.text() || 'Failed to load referral leads')
  return res.json() as Promise<Array<{ id: string; name: string; company: string; email: string; phone?: string; message?: string; referralCode?: string; createdAt: string }>>
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

// Note: 'forgotPassword' is already defined above (email flow). Duplicate removed.
