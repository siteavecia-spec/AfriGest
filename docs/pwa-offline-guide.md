# PWA & Offline Guide (Skeleton)

## Goals
- Ensure core flows work with unreliable connectivity (POS, product list subset, receipts).

## Service Worker
- File: `apps/web/public/sw.js`
- Strategy: cache-first for app shell; network-first for dynamic APIs with fallback when possible.

## Caching
- Static assets: app shell, fonts, icons.
- Dynamic data: small TTL caches for product lists (paged), receipts.

## Offline Scenarios
- POS: queue in `apps/web/src/offline/salesQueue.ts`; retry policy; error surfacing in `Layout`.
- Transfers/stock: read-only fallback; queued writes (future).

## Testing
- DevTools offline mode; simulate 3G.
- Verify installability; ensure manifest correctness.

## Limitations & Next Steps
- Define max cache sizes per resource.
- Add background sync for queued writes where supported.
