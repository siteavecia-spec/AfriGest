# S3 Private Assets via CloudFront Signed URLs (GET)

This document describes how AfriGest serves private media (product images, invoices, attachments) from S3 securely via CloudFront using GET Signed URLs. It also covers required environment variables, IAM, caching, and reusable implementation patterns for API and Web apps.

## Goals
- Keep all sensitive assets private in S3 (no public ACLs). 
- Deliver assets at scale and low latency with CloudFront.
- Grant time-limited access using CloudFront Signed URLs for GET.
- Simple, reusable API helpers and front‑end usage patterns.

## High‑Level Architecture
```mermaid
flowchart LR
  subgraph AWS
    S3[(S3 Private Bucket)]
    CF[CloudFront Distribution\nOrigin Access Control (OAC)]
  end

  API[[AfriGest API]] -->|Generate Signed URL| Client
  Client[Browser / App] -->|GET with Signed URL| CF --> S3
```

- S3 bucket is private; no public reads/writes.
- CloudFront uses Origin Access Control (OAC) to fetch from S3.
- API issues CloudFront Signed URLs for clients; clients fetch directly from CloudFront.

## CloudFront Signed URL Basics
- Use CloudFront Key Pair (public key in CloudFront, private key in API secrets) or use the newer `@aws-sdk/cloudfront-signer` utilities.
- Signed URL contains policy/signature that expires after a short TTL.
- Only GET is supported in this pattern. For uploads, keep using S3 presigned PUT if needed (out of scope here).

## Environments and Secrets
Define the following variables. Names can be adapted to your existing config loaders.

- Backend (API):
  - `AWS_REGION` (e.g., `eu-west-1`)
  - `AWS_S3_PRIVATE_BUCKET` (e.g., `afrigest-private-assets`)
  - `CLOUDFRONT_DOMAIN` (e.g., `d111111abcdef8.cloudfront.net` or `cdn.afrigest.example`)
  - `CLOUDFRONT_KEY_PAIR_ID` (CloudFront key pair ID)
  - `CLOUDFRONT_PRIVATE_KEY` (PEM string, base64 or literal secret; keep secure)
  - `CLOUDFRONT_SIGNED_URL_TTL_SECONDS` (e.g., `300`)

- Frontend (Web):
  - `VITE_PUBLIC_CDN_DOMAIN` or `NEXT_PUBLIC_CDN_DOMAIN` (depending on framework)
  - No private keys are used in the front‑end.

- IAM / Infra:
  - API runtime must have permission to read app configuration and store the private key securely (e.g., in Secrets Manager or environment var with restricted access).
  - CloudFront OAC must have permissions to read from the S3 bucket (bucket policy granting OAC).

## Bucket, Distribution, and Policy Notes
- S3 Bucket:
  - Block all public access.
  - Optional: Use prefix structure per tenant, e.g., `tenants/{tenantId}/media/...`.
- CloudFront Distribution:
  - Origin: the S3 bucket with OAC.
  - Behaviors: Cache based on path/prefix; enable compression; set appropriate TTLs.
  - Viewer protocol policy: Redirect HTTP to HTTPS.
  - Price class and WAF as appropriate.
- CORS: Not required for basic GET if served as assets; add if you expect cross‑origin `fetch` or XHR usage.

## API Implementation Pattern (Node.js, AWS SDK v3)
Use `@aws-sdk/cloudfront-signer` to sign URLs.

```ts
// libs/cdn/sign.ts
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";

export type SignOptions = {
  domain: string; // CLOUDFRONT_DOMAIN
  keyPairId: string; // CLOUDFRONT_KEY_PAIR_ID
  privateKey: string; // CLOUDFRONT_PRIVATE_KEY (PEM)
  ttlSeconds?: number; // CLOUDFRONT_SIGNED_URL_TTL_SECONDS
};

export function signCloudFrontUrl(
  pathOrAbsolute: string,
  opts: SignOptions
) {
  const url = pathOrAbsolute.startsWith("http")
    ? pathOrAbsolute
    : `https://${opts.domain}${pathOrAbsolute.startsWith("/") ? "" : "/"}${pathOrAbsolute}`;

  const expires = Math.floor(Date.now() / 1000) + (opts.ttlSeconds ?? 300);

  return getSignedUrl({
    url,
    keyPairId: opts.keyPairId,
    dateLessThan: new Date(expires * 1000).toISOString(),
    privateKey: opts.privateKey,
  });
}
```

Example API handler that returns a signed URL for a product image path:

```ts
// routes/ecommerce/media.ts
import { signCloudFrontUrl } from "../../libs/cdn/sign";

export async function getProductImageSignedUrl(req, res) {
  const { tenantId, path } = req.query; // e.g., tenants/123/media/products/p1.jpg

  // Authorization & tenancy checks here
  // Ensure path is sanitized and belongs to the tenant

  const url = signCloudFrontUrl(`/${path}`, {
    domain: process.env.CLOUDFRONT_DOMAIN!,
    keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID!,
    privateKey: process.env.CLOUDFRONT_PRIVATE_KEY!,
    ttlSeconds: Number(process.env.CLOUDFRONT_SIGNED_URL_TTL_SECONDS ?? 300),
  });

  return res.json({ url, expiresIn: Number(process.env.CLOUDFRONT_SIGNED_URL_TTL_SECONDS ?? 300) });
}
```

## Front‑End Usage Pattern
- Call the API endpoint to obtain a short‑lived signed URL.
- Use the returned URL directly in `img` tags or as `src` in components.

```tsx
// Example React snippet
const [url, setUrl] = useState<string | null>(null);
useEffect(() => {
  fetch(`/api/tenants/${tenantId}/ecommerce/media/signed-url?path=${encodeURIComponent(assetPath)}`)
    .then(r => r.json())
    .then(({ url }) => setUrl(url));
}, [tenantId, assetPath]);

return url ? <img src={url} alt="product" loading="lazy" /> : null;
```

## Cache and Performance Considerations
- Signed URLs are unique per request; CloudFront cache hit ratio may reduce for the exact URL. Prefer:
  - Maintain the origin object key stable (e.g., `p1.jpg?v=etag`), and sign the full URL so edge can still cache by object.
  - Keep TTL modest (1–10 minutes) to reduce risk if a URL leaks.
- Use object versioning or checksum query strings to bust caches after updates.

## Security Considerations
- Store `CLOUDFRONT_PRIVATE_KEY` in a secure secret store or protected env var.
- Validate that requested paths belong to the caller’s tenant; never sign arbitrary S3 keys.
- Do not include personally identifiable information in object keys.
- Log and rate limit the signing endpoint.

## Troubleshooting
- 403 from CloudFront:
  - Check signature, key pair ID, expiration, system clock skew.
  - Ensure OAC is configured and S3 bucket policy allows the OAC.
- MIME type issues: Set correct `Content-Type` metadata on S3 objects.
- Mixed content: Ensure HTTPS everywhere.

## Checklist
- CloudFront Distribution with OAC -> S3 (private).
- CloudFront key pair configured; private key stored in API secret.
- API helper using `@aws-sdk/cloudfront-signer`.
- Endpoint to sign paths with tenant validation.
- Front‑end consumes the signed URL.
- Monitoring and logs for 4xx/5xx at CloudFront and API.
