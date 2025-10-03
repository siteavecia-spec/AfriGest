import { useState } from 'react'
import { Box, Button, Card, CardContent, Stack, TextField, Typography, Alert } from '@mui/material'
import StorefrontHeader from '../../components/Storefront/Header'
import { ecomGetPublicOrder } from '../../api/client_clean'

export default function StorefrontTrack() {
  const [orderId, setOrderId] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any | null>(null)

  const onTrack = async () => {
    setLoading(true); setError(null); setData(null)
    try {
      const res = await ecomGetPublicOrder(orderId.trim(), email.trim() || undefined)
      setData(res)
    } catch (e: any) {
      setError(e?.message || 'Suivi indisponible')
    } finally { setLoading(false) }
  }

  return (
    <Box>
      <StorefrontHeader />
      <Typography variant="h5" gutterBottom>Suivi de commande</Typography>
      <Card>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField label="Référence commande" value={orderId} onChange={e => setOrderId(e.target.value)} fullWidth size="small" />
            <TextField label="Email (optionnel)" value={email} onChange={e => setEmail(e.target.value)} fullWidth size="small" />
            <Button variant="contained" disabled={loading || !orderId.trim()} onClick={onTrack}>Suivre</Button>
          </Stack>
          {error && <Typography color="text.secondary" sx={{ mt: 2 }}>{error}</Typography>}
          {data && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Commande {data.id}</Typography>
              <Alert severity="info" sx={{ mt: 1 }}>Statut: {data.status} • Paiement: {data.paymentStatus || 'pending'} • Total: {Number(data.total || 0).toLocaleString('fr-FR')} {data.currency}</Alert>
              {Array.isArray(data.items) && data.items.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="subtitle2">Articles</Typography>
                  {data.items.map((it: any, idx: number) => (
                    <Typography key={`${it.sku}-${idx}`}>• {it.sku} x{it.quantity} — {(Number(it.price || 0)).toLocaleString('fr-FR')}</Typography>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}
