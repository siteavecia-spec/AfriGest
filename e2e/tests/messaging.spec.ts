import { test, expect, request } from '@playwright/test'

const API_URL = process.env.VITE_API_URL || process.env.API_URL || 'http://localhost:4000'
const TENANT = process.env.E2E_TENANT || 'demo'

// Two actors for messaging E2E
const USER_A_ID = process.env.E2E_USER_A_ID || ''
const USER_B_ID = process.env.E2E_USER_B_ID || ''
const USER_A_TOKEN = process.env.E2E_USER_A_TOKEN || ''
const USER_B_TOKEN = process.env.E2E_USER_B_TOKEN || ''

function authHeaders(token: string) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

test.describe('Messaging REST flows (send/read)', () => {
  test.skip(({ }) => !(USER_A_ID && USER_B_ID && USER_A_TOKEN && USER_B_TOKEN), 'E2E user IDs/tokens missing')

  test('User A sends to User B, then B marks read', async () => {
    const ctx = await request.newContext()

    // A sends message to B
    const sendRes = await ctx.post(`${API_URL}/api/tenants/${TENANT}/messaging/message`, {
      headers: authHeaders(USER_A_TOKEN),
      data: { toUserId: USER_B_ID, content: `E2E hello from A at ${Date.now()}` }
    })
    expect(sendRes.status()).toBeLessThan(500)
    const sendJson = await sendRes.json()
    expect(sendJson.ok).toBeTruthy()
    const messageId = sendJson.message?.id
    expect(messageId).toBeTruthy()

    // B fetches conversation and should see the new message
    const convoB = await ctx.get(`${API_URL}/api/tenants/${TENANT}/messaging/conversation/${USER_A_ID}?limit=10`, {
      headers: authHeaders(USER_B_TOKEN)
    })
    expect(convoB.status()).toBeLessThan(500)
    const convoBJson = await convoB.json()
    expect(Array.isArray(convoBJson.items)).toBeTruthy()

    // B marks read
    const readRes = await ctx.put(`${API_URL}/api/tenants/${TENANT}/messaging/${messageId}/read`, {
      headers: authHeaders(USER_B_TOKEN)
    })
    expect(readRes.status()).toBeLessThan(500)
    const readJson = await readRes.json()
    expect(readJson.ok).toBeTruthy()
  })
})
