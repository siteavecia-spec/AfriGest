import { useEffect, useState } from 'react'
import { Box, Button, Card, CardContent, Container, Grid, Stack, Typography } from '@mui/material'
import Page from '../components/Page'
import { getPendingSales } from '../offline/salesQueue'
import { listPendingReceivings } from '../offline/poQueue'
import { listPendingReturns } from '../offline/returnsQueue'
import { useNavigate } from 'react-router-dom'

export default function TasksPage() {
  const [salesN, setSalesN] = useState(0)
  const [rxN, setRxN] = useState(0)
  const [rtN, setRtN] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    ;(async () => {
      try { setSalesN(((await getPendingSales()) || []).length) } catch { setSalesN(0) }
      try { setRxN(((await listPendingReceivings()) || []).length) } catch { setRxN(0) }
      try { setRtN(((await listPendingReturns()) || []).length) } catch { setRtN(0) }
    })()
  }, [])

  return (
    <Page title="Tâches" subtitle="Actions recommandées et éléments en attente">
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="h6">Ventes en attente</Typography>
                <Typography color="text.secondary">{salesN} vente(s) à synchroniser</Typography>
                <Button variant="outlined" onClick={() => navigate('/pos')}>Ouvrir POS</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="h6">Réceptions en attente</Typography>
                <Typography color="text.secondary">{rxN} réception(s) à synchroniser</Typography>
                <Button variant="outlined" onClick={() => navigate('/receiving')}>Ouvrir Réceptions</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Stack spacing={1}>
                <Typography variant="h6">Retours en attente</Typography>
                <Typography color="text.secondary">{rtN} retour(s) à synchroniser</Typography>
                <Button variant="outlined" onClick={() => navigate('/returns')}>Ouvrir Retours</Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Page>
  )
}
