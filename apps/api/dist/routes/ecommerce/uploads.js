"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const env_1 = require("../../config/env");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const router = (0, express_1.Router)({ mergeParams: true });
const bodySchema = zod_1.z.object({
    filename: zod_1.z.string().min(1),
    contentType: zod_1.z.string().min(3)
});
function getS3() {
    const { S3_REGION, S3_BUCKET } = env_1.env;
    if (!S3_REGION || !S3_BUCKET)
        return null;
    return new client_s3_1.S3Client({ region: S3_REGION, credentials: undefined });
}
// POST /api/tenants/:tenantId/ecommerce/uploads/presign
router.post('/presign', async (req, res) => {
    try {
        const parsed = bodySchema.safeParse(req.body);
        if (!parsed.success)
            return res.status(400).json({ error: 'Invalid payload' });
        const s3 = getS3();
        if (!s3)
            return res.status(400).json({ error: 'S3 not configured' });
        const bucket = env_1.env.S3_BUCKET;
        const keyPrefix = (env_1.env.S3_KEY_PREFIX || 'uploads/').replace(/^\/+|\/+$/g, '');
        const { filename, contentType } = parsed.data;
        const key = `${keyPrefix}/${Date.now()}-${encodeURIComponent(filename)}`;
        const cmd = new client_s3_1.PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
        const signedUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3, cmd, { expiresIn: 60 * 5 });
        const publicUrl = `https://${bucket}.s3.${env_1.env.S3_REGION}.amazonaws.com/${key}`;
        return res.json({ signedUrl, key, url: publicUrl, bucket });
    }
    catch (e) {
        return res.status(500).json({ error: e?.message || 'Failed to create upload URL' });
    }
});
exports.default = router;
