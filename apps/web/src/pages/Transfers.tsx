import { useEffect, useState } from 'react'
import { Box, Button, Container, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { createTransfer, listTransfers, sendTransfer, receiveTransfer, listProducts } from '../api/client_clean'
import { useBoutique } from '../context/BoutiqueContext'
import ErrorBanner from '../components/ErrorBanner'
import { useI18n } from '../i18n/i18n'

export default function TransfersPage() {
  const { boutiques } = useBoutique()
  const { t } = useI18n()
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [transfers, setTransfers] = useState<Array<{ id: string; sourceBoutiqueId: string; destBoutiqueId: string; status: string; reference?: string; token: string; createdAt: string }>>([])
  const [products, setProducts] = useState<Array<any>>([])

  // Create form
  const [sourceId, setSourceId] = useState('')
  const [destId, setDestId] = useState('')
  const [reference, setReference] = useState('')
  const [rows, setRows] = useState<Array<{ id: string; productId: string; quantity: number }>>([{ id: 'r-1', productId: '', quantity: 1 }])
  // Simulated QR receive: paste token to receive transfer
  const [scanToken, setScanToken] = useState('')
  const [qrById, setQrById] = useState<Record<string, string>>({}) // transferId -> dataURL
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const scannerDivId = 'afrigest-qr-scanner'

  async function ensureQRCodeLib(): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = 'qrcode-cdn-script'
      const w: any = window as any
      if (w.QRCode) return resolve(w.QRCode)
      if (document.getElementById(id)) {
        const waiter = setInterval(() => {
          if (w.QRCode) { clearInterval(waiter); resolve(w.QRCode) }
        }, 100)
        setTimeout(() => { clearInterval(waiter); reject(new Error('QRCode CDN load timeout')) }, 5000)
        return
      }

  async function ensureHtml5QrCodeLib(): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = 'html5-qrcode-cdn-script'
      const w: any = window as any
      if (w.Html5Qrcode) return resolve(w.Html5Qrcode)
      if (document.getElementById(id)) {
        const waiter = setInterval(() => { if (w.Html5Qrcode) { clearInterval(waiter); resolve(w.Html5Qrcode) } }, 100)
        setTimeout(() => { clearInterval(waiter); reject(new Error('Html5Qrcode CDN load timeout')) }, 5000)
        return
      }
      const s = document.createElement('script')
      s.id = id
      s.src = 'https://unpkg.com/html5-qrcode'
      s.onload = () => resolve(w.Html5Qrcode)
      s.onerror = reject
      document.body.appendChild(s)
    })
  }
      const s = document.createElement('script')
      s.id = id
      s.src = 'https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js'
      s.onload = () => resolve(w.QRCode)
      s.onerror = reject
      document.body.appendChild(s)
    })
  }

  const load = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const [trs, prods] = await Promise.all([
        listTransfers(),
        listProducts(200, 0).catch(() => [])
      ])
      setTransfers(trs)
      setProducts(prods)
    } catch (e: any) {
      setMessage(e?.message || 'Erreur chargement transferts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const onCreate = async () => {
    try {
      setLoading(true)
      setMessage(null)
      if (!sourceId || !destId) throw new Error('Sélectionnez la boutique source et destination')
      const items = rows.filter(r => r.productId && (r.quantity || 0) > 0).map(r => ({ productId: r.productId, quantity: r.quantity }))
      if (items.length === 0) throw new Error('Ajoutez au moins un article')
      await createTransfer({ sourceBoutiqueId: sourceId, destBoutiqueId: destId, reference: reference || undefined, items })
      setSourceId(''); setDestId(''); setReference(''); setRows([{ id: 'r-1', productId: '', quantity: 1 }])
      await load()
      setMessage('Transfert créé')
    } catch (e: any) {
      setMessage(e?.message || 'Erreur création transfert')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h5" gutterBottom>{t('transfers.title') || 'Transferts inter‑boutiques (MVP)'}</Typography>
      {message && <ErrorBanner message={message} onRetry={() => load()} />}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={600}>{t('transfers.new') || 'Nouveau transfert'}</Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField select label="Source" value={sourceId} onChange={e => setSourceId(e.target.value)} sx={{ minWidth: 220 }}>
              {boutiques.map(b => (<MenuItem key={b.id} value={b.id}>{b.code ? `${b.code} — ` : ''}{b.name}</MenuItem>))}
            </TextField>
            <TextField select label="Destination" value={destId} onChange={e => setDestId(e.target.value)} sx={{ minWidth: 220 }}>
              {boutiques.map(b => (<MenuItem key={b.id} value={b.id}>{b.code ? `${b.code} — ` : ''}{b.name}</MenuItem>))}
            </TextField>
            <TextField label="Référence" value={reference} onChange={e => setReference(e.target.value)} />
          </Stack>
          {rows.map((r, idx) => (
            <Stack key={r.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
              <TextField select label={`Produit #${idx+1}`} value={r.productId} onChange={e => setRows(prev => prev.map(x => x.id === r.id ? { ...x, productId: e.target.value } : x))} sx={{ minWidth: 320 }}>
                {products.length === 0 ? (<MenuItem value="" disabled>Aucun produit</MenuItem>) : (
                  products.map((p: any) => (<MenuItem key={p.id} value={p.id}>{p.sku} — {p.name}</MenuItem>))
                )}
              </TextField>
              <TextField label="Quantité" type="number" value={r.quantity} onChange={e => setRows(prev => prev.map(x => x.id === r.id ? { ...x, quantity: Number(e.target.value) } : x))} inputProps={{ min: 1 }} sx={{ width: 160 }} />
              <Button color="error" onClick={() => setRows(prev => prev.length > 1 ? prev.filter(x => x.id !== r.id) : prev)}>Supprimer</Button>
            </Stack>
          ))}
          <Button variant="outlined" size="small" onClick={() => setRows(prev => [...prev, { id: 'r-' + Date.now(), productId: '', quantity: 1 }])}>{t('transfers.add_line') || 'Ajouter une ligne'}</Button>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" onClick={onCreate} disabled={loading}>{t('common.create') || 'Créer'}</Button>
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle1" fontWeight={600}>{t('transfers.history') || 'Historique'}</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mt: 1, mb: 2 }}>
          <TextField label={t('transfers.scan_token_label') || 'Scanner (coller token)'} value={scanToken} onChange={e => setScanToken(e.target.value)} placeholder="tr-...-123456" sx={{ flex: 1 }} />
          <Button variant="contained" disabled={loading || !scanToken.trim()} onClick={async () => {
            try {
              setLoading(true)
              const t = transfers.find(x => x.token === scanToken.trim())
              if (!t) throw new Error('Token inconnu')
              if (t.status !== 'in_transit') throw new Error('Transfert non envoyé ou déjà reçu')
              await receiveTransfer(t.id)
              setScanToken('')
              await load()
            } catch (e: any) {
              setMessage(e?.message || 'Erreur réception par token')
            } finally {
              setLoading(false)
            }
          }}>{t('transfers.receive_by_token') || 'Réceptionner par token'}</Button>
        </Stack>
        {/* Camera scanner */}
        <Stack spacing={1} sx={{ mb: 2 }}>
          {!scanning ? (
            <Button size="small" variant="outlined" onClick={async () => {
              try {
                setScanError(null)
                const Html5Qrcode = await ensureHtml5QrCodeLib()
                const w: any = window as any
                if (!w._afgScanner) w._afgScanner = new Html5Qrcode(scannerDivId)
                const cfg = { fps: 10, qrbox: { width: 200, height: 200 } }
                await w._afgScanner.start({ facingMode: 'environment' }, cfg, async (decodedText: string) => {
                  try {
                    const t = transfers.find((x: any) => x.token === decodedText.trim())
                    if (t && t.status === 'in_transit') {
                      setLoading(true)
                      await receiveTransfer(t.id)
                      await load()
                      setLoading(false)
                    }
                  } catch (err) { /* ignore */ }
                })
                setScanning(true)
              } catch (err: any) {
                setScanError(err?.message || 'Erreur démarrage caméra')
              }
            }}>{t('transfers.scan_camera') || 'Scanner avec la caméra'}</Button>
          ) : (
            <Button size="small" color="error" variant="outlined" onClick={async () => {
              try {
                const w: any = window as any
                if (w._afgScanner) await w._afgScanner.stop()
              } catch {}
              setScanning(false)
            }}>{t('transfers.stop_scan') || 'Arrêter le scan'}</Button>
          )}
          {scanError && <Typography color="error">{scanError}</Typography>}
          <Box id={scannerDivId} sx={{ width: 240, height: 240, border: '1px dashed #ccc', display: scanning ? 'block' : 'none' }} />
        </Stack>
        <Stack spacing={1} sx={{ mt: 1 }}>
          {transfers.length === 0 ? (
            <Typography color="text.secondary">Aucun transfert.</Typography>
          ) : (
            transfers.map(t => (
              <Box key={t.id} sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center', border: '1px solid #eee', borderRadius: 1, p: 1 }}>
                <Typography sx={{ minWidth: 120 }}>{t.id}</Typography>
                <Typography sx={{ flex: 1 }}>De {t.sourceBoutiqueId} → {t.destBoutiqueId} • {t.reference || '—'} • {new Date(t.createdAt).toLocaleString()}</Typography>
                <Typography>Status: {t.status}</Typography>
                <Stack spacing={0.5} sx={{ minWidth: 280 }}>
                  <Typography variant="caption" color="text.secondary">Token: {t.token}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" onClick={() => { navigator.clipboard?.writeText(t.token) }}>{t('transfers.copy_token') || 'Copier token'}</Button>
                    {t.status === 'created' && <Button size="small" onClick={async () => { try { setLoading(true); await sendTransfer(t.id); await load() } finally { setLoading(false) } }}>{t('transfers.send') || 'Envoyer'}</Button>}
                    {t.status === 'in_transit' && <Button size="small" variant="contained" onClick={async () => { try { setLoading(true); await receiveTransfer(t.id); await load() } finally { setLoading(false) } }}>{t('transfers.receive') || 'Réceptionner'}</Button>}
                    <Button size="small" onClick={async () => {
                      try {
                        const QRCode = await ensureQRCodeLib()
                        const url = await QRCode.toDataURL(t.token, { width: 128 })
                        setQrById(prev => ({ ...prev, [t.id]: url }))
                      } catch {}
                    }}>{t('transfers.show_qr') || 'Afficher QR'}</Button>
                  </Stack>
                </Stack>
                {qrById[t.id] && (
                  <img src={qrById[t.id]} alt={`QR ${t.id}`} style={{ width: 96, height: 96 }} />
                )}
              </Box>
            ))
          )}
        </Stack>
      </Paper>
    </Container>
  )
}
