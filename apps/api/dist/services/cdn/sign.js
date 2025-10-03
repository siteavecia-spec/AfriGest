"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signCloudFrontUrl = signCloudFrontUrl;
const cloudfront_signer_1 = require("@aws-sdk/cloudfront-signer");
function signCloudFrontUrl(pathOrAbsolute, opts) {
    const url = pathOrAbsolute.startsWith('http')
        ? pathOrAbsolute
        : `https://${opts.domain}${pathOrAbsolute.startsWith('/') ? '' : '/'}${pathOrAbsolute}`;
    const expires = Math.floor(Date.now() / 1000) + (opts.ttlSeconds ?? 300);
    return (0, cloudfront_signer_1.getSignedUrl)({
        url,
        keyPairId: opts.keyPairId,
        dateLessThan: new Date(expires * 1000).toISOString(),
        privateKey: opts.privateKey,
    });
}
