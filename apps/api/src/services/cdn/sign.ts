import { getSignedUrl } from '@aws-sdk/cloudfront-signer'

export type SignOptions = {
  domain: string
  keyPairId: string
  privateKey: string
  ttlSeconds?: number
}

export function signCloudFrontUrl(pathOrAbsolute: string, opts: SignOptions) {
  const url = pathOrAbsolute.startsWith('http')
    ? pathOrAbsolute
    : `https://${opts.domain}${pathOrAbsolute.startsWith('/') ? '' : '/'}${pathOrAbsolute}`

  const expires = Math.floor(Date.now() / 1000) + (opts.ttlSeconds ?? 300)

  return getSignedUrl({
    url,
    keyPairId: opts.keyPairId,
    dateLessThan: new Date(expires * 1000).toISOString(),
    privateKey: opts.privateKey,
  })
}
