export function trackEvent(action: string, params?: Record<string, any>) {
  try {
    const gtag = (window as any).gtag
    if (typeof gtag === 'function') {
      gtag('event', action, params || {})
    }
  } catch {}
}

export function setupOutboundLinkTracking() {
  try {
    const handler = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.('a') as HTMLAnchorElement | null
      if (!a) return
      const href = a.getAttribute('href') || ''
      if (!href || href.startsWith('#')) return
      const isExternal = (() => {
        try {
          const url = new URL(href, window.location.origin)
          return url.origin !== window.location.origin
        } catch { return false }
      })()
      if (isExternal) {
        trackEvent('outbound_link_click', { href })
      }
    }
    window.addEventListener('click', handler, { capture: true })
  } catch {}
}
