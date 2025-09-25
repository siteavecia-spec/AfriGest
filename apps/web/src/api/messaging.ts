import { API_URL, getTenantId } from './client_clean'

async function authFetch(input: RequestInfo | URL, init?: RequestInit & { retrying?: boolean }): Promise<Response> {
  const token = localStorage.getItem('afrigest_token')
  const company = localStorage.getItem('afrigest_company')
  const email = localStorage.getItem('afrigest_email')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (company) headers['x-company'] = company
  if (email) headers['x-user-email'] = email
  const res = await fetch(input, { ...(init || {}), headers: { ...headers, ...(init?.headers || {}) } })
  if (res.status !== 401 || init?.retrying) return res
  const refresh = localStorage.getItem('afrigest_refresh')
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
  const retryHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
  const token2 = localStorage.getItem('afrigest_token')
  const email2 = localStorage.getItem('afrigest_email')
  if (token2) retryHeaders['Authorization'] = `Bearer ${token2}`
  if (company) retryHeaders['x-company'] = company
  if (email2) retryHeaders['x-user-email'] = email2
  return (fetch as any)(input, { ...(init as any), headers: retryHeaders, retrying: true })
}

export async function msgListConversations() {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/messaging/conversations`)
  if (!res.ok) throw new Error(await res.text() || 'Failed to load conversations')
  return res.json() as Promise<{ items: Array<{ id: string; peerUserId: string; lastMessage?: { content: string; createdAt: string; senderId: string }; unread: number; updatedAt: string }>, tenantId: string }>
}

export async function msgGetConversation(peerUserId: string, opts?: { limit?: number; before?: string }) {
  const tenantId = getTenantId()
  const params = new URLSearchParams()
  if (opts?.limit) params.set('limit', String(opts.limit))
  if (opts?.before) params.set('before', opts.before)
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/messaging/conversation/${encodeURIComponent(peerUserId)}${params.toString() ? `?${params.toString()}` : ''}`)
  if (!res.ok) throw new Error(await res.text() || 'Failed to load conversation')
  return res.json() as Promise<{ items: Array<{ id: string; conversationId: string; senderId: string; content: string; createdAt: string; read?: boolean; readAt?: string }>, conversationId: string | null, tenantId: string }>
}

export async function msgSendMessage(toUserId: string, content: string, related?: { type?: string; id?: string }) {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/messaging/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ toUserId, content, related })
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to send message')
  return res.json() as Promise<{ ok: true; message: any }>
}

export async function msgMarkRead(messageId: string) {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/messaging/${encodeURIComponent(messageId)}/read`, {
    method: 'PUT'
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to mark as read')
  return res.json() as Promise<{ ok: true }>
}

export async function msgGetPresence() {
  const tenantId = getTenantId()
  const res = await authFetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/presence`)
  if (!res.ok) throw new Error(await res.text() || 'Failed to get presence')
  return res.json() as Promise<{ tenantId: string; items: Array<{ userId: string; status: 'online'|'idle'|'offline'; lastSeen: string }> }>
}
