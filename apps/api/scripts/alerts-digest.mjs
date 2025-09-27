#!/usr/bin/env node
/*
  Triggers GET /alerts/digest with auth once a day.
  Env:
    API_URL                default: http://localhost:4000
    CRON_BEARER            required: Bearer access token for a service/admin account
    CRON_COMPANY           optional: company code header (maps to tenant)
    CRON_TO                optional: email to send preview to
    CRON_DAYS              optional: number of days window (default 30)
    CRON_SECTOR            optional: sector filter (default 'all')
*/

const API_URL = process.env.API_URL || 'http://localhost:4000'
const BEARER = process.env.CRON_BEARER || process.env.AFRIGEST_CRON_BEARER
const COMPANY = process.env.CRON_COMPANY || process.env.AFRIGEST_COMPANY
const TO = process.env.CRON_TO || ''
const DAYS = Number(process.env.CRON_DAYS || 30)
const SECTOR = process.env.CRON_SECTOR || 'all'

if (!BEARER) {
  console.error('[alerts-digest] Missing CRON_BEARER env')
  process.exit(2)
}

async function main() {
  const q = new URLSearchParams()
  if (Number.isFinite(DAYS) && DAYS > 0) q.set('days', String(DAYS))
  if (SECTOR) q.set('sector', SECTOR)
  if (TO) q.set('to', TO)
  const url = `${API_URL.replace(/\/$/, '')}/alerts/digest?${q.toString()}`
  const headers = { 'Authorization': `Bearer ${BEARER}` }
  if (COMPANY) headers['x-company'] = COMPANY
  try {
    const res = await fetch(url, { headers })
    const text = await res.text()
    if (!res.ok) {
      console.error(`[alerts-digest] Failed ${res.status}: ${text}`)
      process.exit(1)
    }
    try {
      const json = JSON.parse(text)
      console.log(`[alerts-digest] ok: total=${json.total}, preview=${(json.preview||[]).length}`)
    } catch {
      console.log(`[alerts-digest] ok: ${text}`)
    }
  } catch (e) {
    console.error('[alerts-digest] Error:', e?.message || e)
    process.exit(1)
  }
}

main()
