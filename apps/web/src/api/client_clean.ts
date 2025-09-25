export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

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

async function authFetch(input: RequestInfo | URL, init?: RequestInit & { retrying?: boolean }): Promise<Response> {
  const headers = { ...(init?.headers || {}), ...authHeaders() }
  const res = await fetch(input, { ...init, headers })
  if (res.status !== 401 || init?.retrying) return res
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
  return (fetch as any)(input, { ...(init as any), headers: retryHeaders, retrying: true })
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
