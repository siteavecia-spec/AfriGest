import { useEffect, useState } from 'react'
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material'
import { listRestockRequests, approveRestockRequest, rejectRestockRequest, fulfillRestockRequest } from '../api/client_clean'
import { useNavigate } from 'react-router-dom'
import ErrorBanner from '../components/ErrorBanner'

export default function RestockPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [rows, setRows] = useState<Array<{ id: string; boutiqueId: string; productId: string; quantity: number; status: string; createdAt: string }>>([])

  const load = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const items = await listRestockRequests()
      setRows(items)
    } catch (e: any) {
      setMessage(e?.message || 'Erreur chargement demandes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h5" gutterBottom>Demandes de réapprovisionnement</Typography>
      {message && <ErrorBanner message={message} onRetry={() => load()} />}

      <Paper sx={{ p: 3 }}>
        <Stack spacing={1}>
          {rows.length === 0 ? (
            <Typography color="text.secondary">Aucune demande.</Typography>
          ) : (
            rows.map(r => (
              <Box key={r.id} sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center', border: '1px solid #eee', borderRadius: 1, p: 1 }}>
                <Typography sx={{ minWidth: 140 }}>{r.id}</Typography>
                <Typography sx={{ flex: 1 }}>Boutique: {r.boutiqueId} • Produit: {r.productId} • Qté: {r.quantity}</Typography>
                <Typography>Status: {r.status}</Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                  {r.status === 'pending' && (
                    <>
                      <Button size="small" onClick={async () => { try { setLoading(true); await approveRestockRequest(r.id); await load() } catch (e:any) { setMessage(e?.message||'Erreur') } finally { setLoading(false) } }}>Approuver</Button>
                      <Button size="small" color="error" onClick={async () => { try { setLoading(true); await rejectRestockRequest(r.id); await load() } catch (e:any) { setMessage(e?.message||'Erreur') } finally { setLoading(false) } }}>Rejeter</Button>
                    </>
                  )}
                  {r.status === 'approved' && (
                    <>
                      <Button size="small" variant="contained" onClick={async () => { try { setLoading(true); await fulfillRestockRequest(r.id); await load() } catch (e:any) { setMessage(e?.message||'Erreur') } finally { setLoading(false) } }}>Marquer comme livré</Button>
                      <Button size="small" variant="outlined" onClick={() => {
                        // Shortcut to Transfers with prefilled info
                        const params = new URLSearchParams({ prefillProductId: r.productId, prefillQty: String(r.quantity), dest: r.boutiqueId })
                        navigate(`/transfers?${params.toString()}`)
                      }}>Créer un transfert</Button>
                    </>
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">{new Date(r.createdAt).toLocaleString()}</Typography>
              </Box>
            ))
          )}
        </Stack>
      </Paper>
    </Container>
  )
}
