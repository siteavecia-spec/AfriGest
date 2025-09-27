import { useEffect, useState } from 'react'
import { Box, Button, Card, CardContent, Stack, TextField, Typography, Snackbar, Alert } from '@mui/material'
import { ecomCreateOrder, ecomGetSignedMediaUrl, API_URL, getTenantId } from '../../api/client_clean'
import StorefrontHeader from '../../components/Storefront/Header'
import { enableStripe } from '../../config/featureFlags'
import { setMetaDescription } from '../../utils/seo'
import { Elements, useElements, useStripe, CardElement } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

type CartItem = { sku: string; title: string; price: number; currency: string; qty: number; imagePath?: string | null }

function loadCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem('shop_cart') || '[]') } catch { return [] }
}
function clearCart() {
  try { localStorage.removeItem('shop_cart') } catch {}
}

export default function StorefrontCheckout() {
  const [items, setItems] = useState<CartItem[]>([])
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stripeInfo, setStripeInfo] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [imgMap, setImgMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const list = loadCart()
    setItems(list)
    try { document.title = 'Boutique — Checkout' } catch {}
    setMetaDescription("Passez votre commande en toute simplicité avec AfriGest: paiement à la livraison ou test carte (sandbox).")
    // Resolve thumbnails for summary (best-effort)
    ;(async () => {
      const entries = await Promise.all(list.map(async (it) => {
        const key = it.imagePath
        if (!key) return null
        if (key.startsWith('http://') || key.startsWith('https://')) return [it.sku, key] as const
        try {
          const { url } = await ecomGetSignedMediaUrl(key.startsWith('/') ? key.slice(1) : key)
          return [it.sku, url] as const
        } catch {
          return [it.sku, ''] as const
        }

  const simulateMtn = async () => {
    setSubmitting(true)
    setError(null)
    try {
      if (items.length === 0) throw new Error('Panier vide')
      const payload = { items: items.map(it => ({ sku: it.sku, quantity: it.qty, price: it.price, currency })), customer: { email: email || undefined, phone: phone || undefined } }
      const tenantId = getTenantId()
      const token = localStorage.getItem('afrigest_token')
      const company = localStorage.getItem('afrigest_company')
      const res = await fetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/payments/simulate-mtn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(company ? { 'x-company': company } : {}) },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error(await res.text())
      clearCart(); setItems([])
      setMessage('Paiement MTN (simulé) confirmé. Merci !')
      setTimeout(() => { try { (window as any).location.href = '/shop' } catch {} }, 1400)
    } catch (e: any) {
      setError(e?.message || 'Échec paiement MTN (simulation)')
    } finally { setSubmitting(false) }
  }

  const simulateOrange = async () => {
    setSubmitting(true)
    setError(null)
    try {
      if (items.length === 0) throw new Error('Panier vide')
      const payload = { items: items.map(it => ({ sku: it.sku, quantity: it.qty, price: it.price, currency })), customer: { email: email || undefined, phone: phone || undefined } }
      const tenantId = getTenantId()
      const token = localStorage.getItem('afrigest_token')
      const company = localStorage.getItem('afrigest_company')
      const res = await fetch(`${API_URL}/api/tenants/${encodeURIComponent(tenantId)}/ecommerce/payments/simulate-orange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(company ? { 'x-company': company } : {}) },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error(await res.text())
      clearCart(); setItems([])
      setMessage('Paiement Orange (simulé) confirmé. Merci !')
      setTimeout(() => { try { (window as any).location.href = '/shop' } catch {} }, 1400)
    } catch (e: any) {
      setError(e?.message || 'Échec paiement Orange (simulation)')
    } finally { setSubmitting(false) }
  }
      }))
      const map: Record<string, string> = {}
      for (const e of entries) if (e && e[1]) map[e[0]] = e[1]
      setImgMap(map)
    })()
  }, [])

  const total = items.reduce((s, it) => s + it.price * it.qty, 0)
  const currency = items[0]?.currency || 'GNF'

  const onSubmit = async () => {
    setSubmitting(true)
    setMessage(null)
    setError(null)
    try {
      if (items.length === 0) throw new Error('Panier vide')
      const orderItems = items.map(it => ({ sku: it.sku, quantity: it.qty, price: it.price, currency }))
      const res = await ecomCreateOrder({ items: orderItems, customer: { email: email || undefined, phone: phone || undefined }, payment: { provider: 'cod' } })
      clearCart()
      setItems([])
      setMessage(`Commande créée. ${res?.orderId ? 'Référence: ' + res.orderId : ''}`)
      // Redirect back to catalog after short delay
      setTimeout(() => { try { (window as any).location.href = '/shop' } catch {} }, 1500)
    } catch (e: any) {
      setError(e?.message || 'Impossible de créer la commande')
    } finally {
      setSubmitting(false)
    }
  }

  const onStripeTest = async () => {
    setSubmitting(true)
    setStripeInfo(null)
    setError(null)
    try {
      if (items.length === 0) throw new Error('Panier vide')
      const orderItems = items.map(it => ({ sku: it.sku, quantity: it.qty, price: it.price, currency }))
      const res = await ecomCreateOrder({ items: orderItems, customer: { email: email || undefined, phone: phone || undefined }, payment: { provider: 'stripe' } })
      const secret = (res as any)?.payment?.clientSecret
      if (secret) {
        setClientSecret(secret)
        setStripeInfo('Stripe: PaymentIntent créé. Renseignez une carte test pour confirmer.')
      } else {
        setStripeInfo('Stripe: PaymentIntent non retourné (vérifiez la configuration).')
      }
    } catch (e: any) {
      setError(e?.message || 'Impossible de créer la commande Stripe')
    } finally {
      setSubmitting(false)
    }
  }

  // Stripe publishable key (sandbox)
  const STRIPE_PK = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY || ''
  const stripePromise = STRIPE_PK ? loadStripe(STRIPE_PK) : null

  function StripeCardForm({ secret }: { secret: string }) {
    const stripe = useStripe()
    const elements = useElements()
    const [paying, setPaying] = useState(false)
    const [note, setNote] = useState<string | null>(null)

    const confirm = async () => {
      if (!stripe || !elements) return
      setPaying(true)
      setNote(null)
      try {
        const card = elements.getElement(CardElement)
        if (!card) throw new Error('Champ carte introuvable')
        const res = await stripe.confirmCardPayment(secret, { payment_method: { card } })
        if (res.error) throw new Error(res.error.message || 'Échec du paiement')
        setNote('Paiement Stripe confirmé (sandbox).')
      } catch (e: any) {
        setNote(e?.message || 'Échec du paiement Stripe')
      } finally {
        setPaying(false)
      }
    }

    return (
      <Stack spacing={2} sx={{ mt: 2 }}>
        <CardElement options={{ hidePostalCode: true }} />
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" disabled={paying} onClick={confirm}>Confirmer paiement (test)</Button>
          <Typography variant="body2" color="text.secondary">Carte test: 4242 4242 4242 4242 • 12/34 • 123</Typography>
        </Stack>
        {note && <Alert severity="info">{note}</Alert>}
      </Stack>
    )
  }

  return (
    <Box>
      <StorefrontHeader />
      <Typography variant="h5" gutterBottom>Commande — Paiement à la livraison</Typography>
      <Card>
        <CardContent>
          {items.length === 0 ? (
            <Typography color="text.secondary">Votre panier est vide.</Typography>
          ) : (
            <Stack spacing={2}>
              <Stack spacing={1}>
                {items.map(it => (
                  <Stack key={it.sku} direction="row" spacing={1} alignItems="center">
                    {(imgMap[it.sku] || it.imagePath) && (
                      <img src={imgMap[it.sku] || it.imagePath || undefined} alt={it.title} width={40} height={40} style={{ objectFit: 'cover', borderRadius: 4, background: '#f3f4f6' }} />
                    )}
                    <Typography>{it.title} x{it.qty}</Typography>
                  </Stack>
                ))}
              </Stack>
              <Typography>Total: {total.toLocaleString('fr-FR')} {currency}</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Email (optionnel)" type="email" value={email} onChange={e => setEmail(e.target.value)} fullWidth />
                <TextField label="Téléphone (optionnel)" value={phone} onChange={e => setPhone(e.target.value)} fullWidth />
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" href="/shop/cart">Retour au panier</Button>
                <Button variant="contained" disabled={submitting} onClick={onSubmit}>Confirmer (COD)</Button>
                {enableStripe && (
                  <Button variant="outlined" disabled={submitting} onClick={onStripeTest}>Payer par carte (test)</Button>
                )}
                <Button variant="outlined" disabled={submitting} onClick={simulateMtn}>Payer (simulate MTN)</Button>
                <Button variant="outlined" disabled={submitting} onClick={simulateOrange}>Payer (simulate Orange)</Button>
              </Stack>
              {enableStripe && clientSecret && stripePromise && (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <StripeCardForm secret={clientSecret} />
                </Elements>
              )}
              {enableStripe && !STRIPE_PK && (
                <Alert severity="warning">VITE_STRIPE_PUBLISHABLE_KEY manquant: configurez la clé publique Stripe pour confirmer le paiement.</Alert>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>
      <Snackbar open={!!message} autoHideDuration={1400} onClose={() => setMessage(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setMessage(null)} severity="success" variant="filled">{message}</Alert>
      </Snackbar>
      <Snackbar open={!!error} autoHideDuration={1600} onClose={() => setError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setError(null)} severity="error" variant="filled">{error}</Alert>
      </Snackbar>
      <Snackbar open={!!stripeInfo} autoHideDuration={4000} onClose={() => setStripeInfo(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setStripeInfo(null)} severity="info" variant="filled">{stripeInfo}</Alert>
      </Snackbar>
    </Box>
  )
}
