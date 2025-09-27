import { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'crypto'

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()
  const reqId = (req.headers['x-request-id'] as string) || randomUUID()
  ;(req as any).reqId = reqId
  try { res.setHeader('X-Request-Id', reqId) } catch {}

  const tenant = (req as any).tenantKey || ''
  const user = (req as any).auth?.sub || ''
  const routeName = (req as any).route?.path || req.path || ''
  // Request size (best-effort)
  const reqSize = Number(req.headers['content-length'] || 0)

  // Wrap res.write/end to compute response size
  let respSize = 0
  const origWrite = res.write.bind(res)
  const origEnd = res.end.bind(res)
  ;(res as any).write = function (chunk: any, encoding?: BufferEncoding, cb?: (error?: Error) => void) {
    try { respSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk || '')) } catch {}
    return origWrite(chunk, encoding as any, cb as any)
  }
  ;(res as any).end = function (chunk?: any, encoding?: BufferEncoding, cb?: () => void) {
    try { if (chunk) respSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(String(chunk || '')) } catch {}
    return origEnd(chunk as any, encoding as any, cb as any)
  }

  res.on('finish', () => {
    const ms = Date.now() - start
    const payload = {
      ts: new Date().toISOString(),
      reqId,
      method: req.method,
      path: req.originalUrl,
      routeName,
      status: res.statusCode,
      ms,
      tenant,
      user,
      ip: req.ip,
      ua: req.headers['user-agent'] || '',
      reqSize,
      respSize,
    }
    try {
      // Structured, single-line JSON log (can be picked by any collector)
      console.log(JSON.stringify(payload))
    } catch {
      // fallback
      console.log(`[${payload.ts}] ${payload.method} ${payload.path} ${payload.status} ${payload.ms}ms tenant=${tenant} user=${user}`)
    }
  })

  next()
}
