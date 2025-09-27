import React, { createContext, useContext, useMemo, useState } from 'react'

export type Locale = 'fr' | 'en'

// Minimal dictionaries (extend gradually)
const dict: Record<Locale, Record<string, string>> = {
  fr: {
    'nav.dashboard': 'Tableau de bord',
    'nav.pos': 'POS',
    'nav.stock': 'Stock',
    'nav.inventory': 'Inventaire',
    'nav.suppliers': 'Fournisseurs',
    'nav.sales': 'Ventes',
    'nav.users': 'Utilisateurs',
    'nav.settings': 'Paramètres',
    'dashboard.export_today_csv': 'Exporter ventes du jour (CSV)',
    'dashboard.send_alerts_digest': 'Envoyer digest alertes',
    'inventory.title': 'Inventaire (MVP)',
    'inventory.load': 'Charger le stock',
    'inventory.compute': 'Calculer variance',
    'inventory.export': 'Exporter CSV',
    'transfers.title': 'Transferts inter‑boutiques (MVP)',
    'transfers.new': 'Nouveau transfert',
    'transfers.add_line': 'Ajouter une ligne',
    'transfers.history': 'Historique',
    'transfers.scan_camera': 'Scanner avec la caméra',
    'transfers.stop_scan': 'Arrêter le scan',
    'transfers.scan_token_label': 'Scanner (coller token)',
    'transfers.receive_by_token': 'Réceptionner par token',
    'transfers.copy_token': 'Copier token',
    'transfers.send': 'Envoyer',
    'transfers.receive': 'Réceptionner',
    'transfers.show_qr': 'Afficher QR',
    'common.create': 'Créer',
    'pos.title': 'Point de Vente (MVP)',
    'pos.add_to_cart': 'Ajouter au panier',
    'pos.submit_sale': 'Valider la vente',
    'pos.export_receipts_csv': 'Exporter reçus du jour (CSV)',
    'pos.export_receipts_pdf': 'Exporter reçus du jour (PDF)',
    'pos.export_sales_csv': 'Exporter ventes du jour (CSV)'
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.pos': 'POS',
    'nav.stock': 'Stock',
    'nav.inventory': 'Inventory',
    'nav.suppliers': 'Suppliers',
    'nav.sales': 'Sales',
    'nav.users': 'Users',
    'nav.settings': 'Settings',
    'dashboard.export_today_csv': 'Export today\'s sales (CSV)',
    'dashboard.send_alerts_digest': 'Send alerts digest',
    'inventory.title': 'Inventory (MVP)',
    'inventory.load': 'Load stock',
    'inventory.compute': 'Compute variance',
    'inventory.export': 'Export CSV',
    'transfers.title': 'Inter‑store transfers (MVP)',
    'transfers.new': 'New transfer',
    'transfers.add_line': 'Add line',
    'transfers.history': 'History',
    'transfers.scan_camera': 'Scan with camera',
    'transfers.stop_scan': 'Stop scan',
    'transfers.scan_token_label': 'Scan (paste token)',
    'transfers.receive_by_token': 'Receive by token',
    'transfers.copy_token': 'Copy token',
    'transfers.send': 'Send',
    'transfers.receive': 'Receive',
    'transfers.show_qr': 'Show QR',
    'common.create': 'Create',
    'pos.title': 'Point of Sale (MVP)',
    'pos.add_to_cart': 'Add to cart',
    'pos.submit_sale': 'Submit sale',
    'pos.export_receipts_csv': 'Export today\'s receipts (CSV)',
    'pos.export_receipts_pdf': 'Export today\'s receipts (PDF)',
    'pos.export_sales_csv': 'Export today\'s sales (CSV)'
  },
}

interface I18nContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'fr',
  setLocale: () => {},
  t: (k: string) => k,
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const stored = (typeof window !== 'undefined' ? localStorage.getItem('afrigest_locale') : null) as Locale | null
  const [locale, setLocaleState] = useState<Locale>(stored || 'fr')
  const setLocale = (l: Locale) => {
    setLocaleState(l)
    try { localStorage.setItem('afrigest_locale', l) } catch {}
  }
  const t = (key: string) => {
    const d = dict[locale]
    return (d && d[key]) || dict['fr'][key] || key
  }
  const value = useMemo(() => ({ locale, setLocale, t }), [locale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
