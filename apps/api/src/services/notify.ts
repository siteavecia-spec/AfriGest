import nodemailer from 'nodemailer'

export interface LeadPayload {
  id: string
  name: string
  company: string
  email: string
  phone?: string
  message?: string
  referralCode?: string
  createdAt: string
}

// Generic event notification (MVP)
export async function notifyEvent(subject: string, text: string, to?: string, html?: string) {
  const transport = getTransport()
  const toEmail = to || process.env.MAIL_TO
  const from = process.env.MAIL_FROM || 'no-reply@afrigest.local'
  if (!transport || !toEmail) {
    console.log('[notify:event]', { subject, text })
    return { ok: false, reason: 'No SMTP configured' }
  }
  await transport.sendMail({ from, to: toEmail, subject, text, html: html || undefined })
  return { ok: true }
}

export async function sendPasswordResetEmail(toEmail: string, resetLink: string, reason?: string) {
  const transport = getTransport()
  const to = toEmail
  const from = process.env.MAIL_FROM || 'no-reply@afrigest.local'
  const subject = 'Réinitialisation de votre mot de passe AfriGest'
  const text = `Bonjour,\n\nVous avez demandé la réinitialisation de votre mot de passe AfriGest.\n\nCliquez sur le lien ci-dessous pour créer un nouveau mot de passe (valide 15 minutes):\n${resetLink}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.\n${reason ? `\nMotif: ${reason}\n` : ''}\nCordialement,\nL'équipe AfriGest`
  const html = `
  <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #0b1221;">
    <h2 style="margin: 0 0 12px;">Réinitialisation de votre mot de passe</h2>
    <p>Vous avez demandé la réinitialisation de votre mot de passe AfriGest.</p>
    <p>
      <a href="${resetLink}" style="display:inline-block;background:#0b5cff;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">
        Réinitialiser mon mot de passe
      </a>
    </p>
    <p style="margin: 8px 0; color:#6b7280; font-size: 13px;">Lien valide 15 minutes.</p>
    ${reason ? `<p style="margin-top:8px; font-size:13px; color:#6b7280;">Motif: ${reason}</p>` : ''}
    <p style="margin-top: 16px; color: #6b7280; font-size: 12px;">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    <p style="margin-top: 16px; color: #6b7280; font-size: 12px;">AfriGest — Sécurité compte</p>
  </div>`

  if (!transport || !to) {
    console.log('[notify] Password reset', { to, from, subject, text })
    return { ok: false, reason: 'No SMTP configured' }
  }
  await transport.sendMail({ from, to, subject, text, html })
  return { ok: true }
}

function getTransport() {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!host || !port || !user || !pass) return null
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  })
}

export async function notifyNewLead(lead: LeadPayload, extraCc?: string[]) {
  const transport = getTransport()
  const to = process.env.MAIL_TO
  const from = process.env.MAIL_FROM || 'no-reply@afrigest.local'
  const subject = `[AfriGest] Nouvelle demande de démo — ${lead.company}`
  const text = `Nouvelle demande de démo\n\n` +
    `Nom: ${lead.name}\n` +
    `Entreprise: ${lead.company}\n` +
    `Email: ${lead.email}\n` +
    `Téléphone: ${lead.phone || '-'}\n` +
    `Code parrain: ${lead.referralCode || '-'}\n` +
    `Date: ${new Date(lead.createdAt).toLocaleString()}\n\n` +
    `Message:\n${lead.message || '-'}`
  const html = `
  <div style="font-family: Inter, Arial, sans-serif; line-height: 1.5; color: #0b1221;">
    <h2 style="margin: 0 0 12px;">Nouvelle demande de démo</h2>
    <p style="margin: 0 0 8px;"><strong>Nom:</strong> ${lead.name}</p>
    <p style="margin: 0 0 8px;"><strong>Entreprise:</strong> ${lead.company}</p>
    <p style="margin: 0 0 8px;"><strong>Email:</strong> <a href="mailto:${lead.email}">${lead.email}</a></p>
    <p style="margin: 0 0 8px;"><strong>Téléphone:</strong> ${lead.phone || '-'}</p>
    <p style="margin: 0 0 8px;"><strong>Code parrain:</strong> ${lead.referralCode || '-'}</p>
    <p style="margin: 0 0 16px;"><strong>Date:</strong> ${new Date(lead.createdAt).toLocaleString()}</p>
    <div style="padding: 12px; background: #f3f4f6; border-radius: 8px;">
      <div style="font-weight: 600; margin-bottom: 6px;">Message</div>
      <div>${(lead.message || '-').replace(/\n/g, '<br/>')}</div>
    </div>
    <p style="margin-top: 16px; color: #6b7280; font-size: 12px;">AfriGest — Notifications demo</p>
  </div>`

  if (!transport || !to) {
    // Fallback: log to console in dev
    console.log('[notify] New lead', { to, from, subject, text })
    return { ok: false, reason: 'No SMTP configured' }
  }

  const cc = (process.env.MAIL_CC || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)

  const mergedCc = Array.from(new Set([...(cc || []), ...((extraCc || []).filter(Boolean))]))

  await transport.sendMail({ from, to, cc: mergedCc.length ? mergedCc : undefined, subject, text, html })
  return { ok: true }
}

export async function sendEmailVerification(toEmail: string, verifyLink: string) {
  const transport = getTransport()
  const to = toEmail
  const from = process.env.MAIL_FROM || 'no-reply@afrigest.local'
  const subject = 'Vérifiez votre adresse email (AfriGest)'
  const text = `Bonjour,\n\nBienvenue sur AfriGest. Merci de confirmer votre adresse email en cliquant sur le lien suivant (valide 24 heures):\n${verifyLink}\n\nSi vous n'êtes pas à l'origine de cette action, ignorez cet email.\nCordialement,\nL'équipe AfriGest`
  const html = `
  <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6; color: #0b1221;">
    <h2 style="margin: 0 0 12px;">Confirmez votre adresse email</h2>
    <p>Bienvenue sur AfriGest. Merci de confirmer votre adresse email.</p>
    <p>
      <a href="${verifyLink}" style="display:inline-block;background:#059669;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">
        Vérifier mon email
      </a>
    </p>
    <p style="margin: 8px 0; color:#6b7280; font-size: 13px;">Lien valide 24 heures.</p>
    <p style="margin-top: 16px; color: #6b7280; font-size: 12px;">Si vous n'êtes pas à l'origine de cette action, ignorez cet email.</p>
    <p style="margin-top: 16px; color: #6b7280; font-size: 12px;">AfriGest — Vérification de compte</p>
  </div>`

  if (!transport || !to) {
    console.log('[notify] Email verification', { to, from, subject, text })
    return { ok: false, reason: 'No SMTP configured' }
  }
  await transport.sendMail({ from, to, subject, text, html })
  return { ok: true }
}
