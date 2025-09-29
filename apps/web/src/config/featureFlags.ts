export const enableEcommerce = (import.meta as any).env?.VITE_ENABLE_ECOMMERCE === 'true'
export const enableMessaging = (import.meta as any).env?.VITE_ENABLE_MESSAGING === 'true'
export const enableStripe = (import.meta as any).env?.VITE_ENABLE_STRIPE === 'true'
export const enablePayments = (import.meta as any).env?.VITE_ENABLE_PAYMENTS === 'true'
export const enableMobileMoney = (import.meta as any).env?.VITE_ENABLE_MOBILE_MONEY === 'true'
export const enablePayPal = (import.meta as any).env?.VITE_ENABLE_PAYPAL === 'true'

// Convenience: Phase 1 defaults (if env not set)
// If both flags are undefined, assume Phase 1 (disable modules beyond MVP)
const bothUndefined = (import.meta as any).env?.VITE_ENABLE_ECOMMERCE === undefined && (import.meta as any).env?.VITE_ENABLE_MESSAGING === undefined

export const isPhase1 = bothUndefined && !enableEcommerce && !enableMessaging

export const showEcommerce = enableEcommerce && !isPhase1
export const showMessaging = enableMessaging && !isPhase1
export const showPayments = enablePayments && !isPhase1
export const showMobileMoney = showPayments && enableMobileMoney
export const showPayPal = showPayments && enablePayPal
