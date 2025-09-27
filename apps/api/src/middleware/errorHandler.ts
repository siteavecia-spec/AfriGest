import type { NextFunction, Request, Response } from 'express'

// 404 handler — must be mounted after all routes
export function notFoundHandler(req: Request, res: Response, _next: NextFunction) {
  const reqId = (req as any).reqId || ''
  try { res.setHeader('X-Request-Id', reqId) } catch {}
  return res.status(404).json({ error: 'Not Found', reqId })
}

// Global error handler — last middleware
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const reqId = (req as any).reqId || ''
  try { res.setHeader('X-Request-Id', reqId) } catch {}

  // Basic normalization
  const status = (typeof err?.status === 'number' && err.status >= 400 && err.status <= 599)
    ? err.status
    : 500
  const code = typeof err?.code === 'string' ? err.code : undefined
  const message = typeof err?.message === 'string' ? err.message : 'Internal Server Error'

  // Log structured error
  try {
    const payload = {
      ts: new Date().toISOString(),
      level: 'error',
      reqId,
      method: req.method,
      path: req.originalUrl,
      status,
      code,
      message,
    }
    console.error(JSON.stringify(payload))
  } catch {}

  // Avoid leaking internals in production. Keep generic message for 500s.
  const body = status >= 500 ? { error: 'Internal Server Error', reqId } : { error: message, code, reqId }
  return res.status(status).json(body)
}
