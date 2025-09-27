import { Router } from 'express'
import { z } from 'zod'
import { env } from '../../config/env'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const router = Router({ mergeParams: true })

const bodySchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(3)
})

function getS3() {
  const { S3_REGION, S3_BUCKET } = env
  if (!S3_REGION || !S3_BUCKET) return null
  return new S3Client({ region: S3_REGION, credentials: undefined })
}

// POST /api/tenants/:tenantId/ecommerce/uploads/presign
router.post('/presign', async (req, res) => {
  try {
    const parsed = bodySchema.safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' })
    const s3 = getS3()
    if (!s3) return res.status(400).json({ error: 'S3 not configured' })
    const bucket = env.S3_BUCKET
    const keyPrefix = (env.S3_KEY_PREFIX || 'uploads/').replace(/^\/+|\/+$/g, '')
    const { filename, contentType } = parsed.data
    const key = `${keyPrefix}/${Date.now()}-${encodeURIComponent(filename)}`
    const cmd = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType })
    const signedUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 })
    const publicUrl = `https://${bucket}.s3.${env.S3_REGION}.amazonaws.com/${key}`
    return res.json({ signedUrl, key, url: publicUrl, bucket })
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'Failed to create upload URL' })
  }
})

export default router
