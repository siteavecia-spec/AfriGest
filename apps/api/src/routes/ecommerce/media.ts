import { Router } from 'express'
import { z } from 'zod'
import { env } from '../../config/env'
import { signCloudFrontUrl } from '../../services/cdn/sign'
import { rateLimit } from '../../middleware/rateLimit'

const router = Router({ mergeParams: true })

// Targeted rate limit for signing: stricter than global
router.use(rateLimit({ windowMs: 60_000, limit: 60 }))

const querySchema = z.object({
  path: z.string().min(1)
})

function isSafePath(p: string) {
  // Prevent path traversal and enforce no scheme/host
  if (p.includes('..')) return false
  if (p.startsWith('http:') || p.startsWith('https:')) return false
  return true
}

// GET /api/tenants/:tenantId/ecommerce/media/signed-url?path=tenants/{tenantId}/media/...
router.get('/signed-url', async (req, res) => {
  try {
    const parsed = querySchema.safeParse(req.query)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid query' })

    const { tenantId } = req.params as { tenantId: string }
    const rawPath = String(parsed.data.path)

    if (!isSafePath(rawPath)) return res.status(400).json({ error: 'Invalid path' })

    // Ensure path is under the tenant namespace
    const expectedPrefix = `tenants/${tenantId}/`
    const normalized = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath
    if (!normalized.startsWith(expectedPrefix)) {
      return res.status(403).json({ error: 'Path does not belong to tenant' })
    }

    if (!env.CLOUDFRONT_DOMAIN || !env.CLOUDFRONT_KEY_PAIR_ID || !env.CLOUDFRONT_PRIVATE_KEY) {
      try { console.warn(JSON.stringify({ level: 'warn', msg: 'Signing requested but CloudFront not configured', reqId: (req as any).reqId || '', tenantId })) } catch {}
      return res.status(400).json({ error: 'CloudFront not configured' })
    }

    const url = signCloudFrontUrl(`/${normalized}`, {
      domain: env.CLOUDFRONT_DOMAIN,
      keyPairId: env.CLOUDFRONT_KEY_PAIR_ID,
      privateKey: env.CLOUDFRONT_PRIVATE_KEY,
      ttlSeconds: env.CLOUDFRONT_SIGNED_URL_TTL_SECONDS || 300
    })

    try { console.log(JSON.stringify({ level: 'info', msg: 'Signed media URL issued', reqId: (req as any).reqId || '', tenantId, keyPrefix: normalized.slice(0, 48) })) } catch {}
    return res.json({ url, expiresIn: env.CLOUDFRONT_SIGNED_URL_TTL_SECONDS || 300 })
  } catch (e: any) {
    try { console.error(JSON.stringify({ level: 'error', msg: 'Signing failed', reqId: (req as any).reqId || '', err: e?.message || String(e) })) } catch {}
    return res.status(500).json({ error: e?.message || 'Failed to sign URL' })
  }
})

export default router
