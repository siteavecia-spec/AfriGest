export interface SMSPayload {
  to: string
  message: string
  from?: string
}

export async function sendSMS(payload: SMSPayload) {
  // MVP: no real provider connected; log to console
  const from = payload.from || process.env.SMS_FROM || 'AFRIGEST'
  console.log('[sms] sending', { to: payload.to, from, message: payload.message })
  // Here we could integrate Orange/MTN provider SDK or HTTP API
  return { ok: true }
}
