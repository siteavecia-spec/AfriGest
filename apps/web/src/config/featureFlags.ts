export const enableEcommerce = (import.meta as any).env?.VITE_ENABLE_ECOMMERCE === 'true'
export const enableMessaging = (import.meta as any).env?.VITE_ENABLE_MESSAGING === 'true'
export const enableStripe = (import.meta as any).env?.VITE_ENABLE_STRIPE === 'true'

// Convenience: Phase 1 defaults (if env not set)
// If both flags are undefined, assume Phase 1 (disable modules beyond MVP)
const bothUndefined = (import.meta as any).env?.VITE_ENABLE_ECOMMERCE === undefined && (import.meta as any).env?.VITE_ENABLE_MESSAGING === undefined

export const isPhase1 = bothUndefined && !enableEcommerce && !enableMessaging

export const showEcommerce = enableEcommerce && !isPhase1
export const showMessaging = enableMessaging && !isPhase1
