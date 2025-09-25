import { API_URL } from './client'

function authHeaders() {
  const token = localStorage.getItem('afrigest_token')
  const company = localStorage.getItem('afrigest_company')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (company) headers['x-company'] = company
  return headers
}

export async function createSupplier(data: { name: string; contactName?: string; phone?: string; email?: string; address?: string }) {
  const res = await fetch(`${API_URL}/suppliers`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to create supplier')
  return res.json()
}

export async function updateSupplier(id: string, data: Partial<{ name: string; contactName: string; phone: string; email: string; address: string }>) {
  const res = await fetch(`${API_URL}/suppliers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text() || 'Failed to update supplier')
  return res.json()
}

export async function deleteSupplier(id: string) {
  const res = await fetch(`${API_URL}/suppliers/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders()
  })
  if (!res.ok && res.status !== 204) throw new Error(await res.text() || 'Failed to delete supplier')
  return true
}
