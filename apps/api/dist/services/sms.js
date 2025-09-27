"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSMS = sendSMS;
async function sendSMS(payload) {
    // MVP: no real provider connected; log to console
    const from = payload.from || process.env.SMS_FROM || 'AFRIGEST';
    console.log('[sms] sending', { to: payload.to, from, message: payload.message });
    // Here we could integrate Orange/MTN provider SDK or HTTP API
    return { ok: true };
}
