import { useEffect, useRef, useState } from 'react'
import { Box, Button, Card, CardContent, Container, Grid, IconButton, MenuItem, Stack, TextField, Typography, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import RefreshIcon from '@mui/icons-material/Refresh'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import EmailIcon from '@mui/icons-material/Email'
import LinkedInIcon from '@mui/icons-material/LinkedIn'
import QRCode from 'qrcode'
import { generateReferralCode, getReferralCode, getReferralStats, getReferralLeads } from '../api/client_clean'

export default function AmbassadorPage() {
  const [code, setCode] = useState<string>('')
  const [company, setCompany] = useState<string>('')
  const [message, setMessage] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [stats, setStats] = useState<{ totalLeads: number; leadsThisMonth: number } | null>(null)
  const [leads, setLeads] = useState<Array<{ id: string; name: string; company: string; email: string; phone?: string; message?: string; referralCode?: string; createdAt: string }>>([])
  const [leadQuery, setLeadQuery] = useState('')
  const [leadPeriod, setLeadPeriod] = useState<'all' | '7' | '30'>('all')
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${encodeURIComponent(code)}` : `/?ref=${encodeURIComponent(code)}`

  const renderQR = async (text: string) => {
    if (!canvasRef.current) return
    await QRCode.toCanvas(canvasRef.current, text, { width: 180 })
  }

  useEffect(() => {
    ;(async () => {
      try {
        const res = await getReferralCode()
        setCode(res.code)
        setCompany(res.company)
        await renderQR(`${shareUrl}`)
        try {
          const st = await getReferralStats()
          setStats(st)
        } catch {}
        try {
          const rl = await getReferralLeads()
          setLeads(rl.slice(0, 10))
        } catch {}
      } catch (e: any) {
        setMessage(e?.message || 'Erreur chargement code parrain')
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (code) renderQR(shareUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setMessage('Copié dans le presse-papiers')
      setTimeout(() => setMessage(null), 1500)
    } catch {}
  }

  const onRegenerate = async () => {
    try {
      const res = await generateReferralCode()
      setCode(res.code)
      setCompany(res.company)
      setMessage('Nouveau code généré')
      setTimeout(() => setMessage(null), 1500)
    } catch (e: any) {
      setMessage(e?.message || 'Impossible de générer un nouveau code')
    }
  }

  const waLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(`Essayez AfriGest ! Demandez une démo via ${shareUrl} (code: ${code})`)}`
  const mailto = `mailto:?subject=${encodeURIComponent('Découvrir AfriGest')}&body=${encodeURIComponent(`Bonjour,

Je vous recommande AfriGest pour la gestion de boutique.
Demandez une démo ici: ${shareUrl}
(Code parrain: ${code})

— ${company}`)}`
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`

  const generateShareCard = async () => {
    // Prepare canvas 1200x630 (Open Graph size)
    const W = 1200, H = 630
    const canvas = document.createElement('canvas')
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')!
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, '#0B1221')
    grad.addColorStop(1, '#1F2A44')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
    // Title
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 64px Inter, Arial'
    ctx.fillText('AfriGest — Ambassadeur', 60, 120)
    // Company and code
    ctx.font = 'bold 48px Inter, Arial'
    ctx.fillStyle = '#7DD3FC'
    ctx.fillText(company || 'Votre entreprise', 60, 200)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 80px Inter, Arial'
    ctx.fillText(code || 'AFG-XXXXXX', 60, 300)
    // URL
    ctx.font = '36px Inter, Arial'
    ctx.fillStyle = '#E5E7EB'
    ctx.fillText(shareUrl, 60, 360)
    // Subtext
    ctx.font = '28px Inter, Arial'
    ctx.fillStyle = '#C7D2FE'
    ctx.fillText('Scannez le QR ou utilisez le code pour demander une démo', 60, 420)
    // QR code image from existing canvas
    const qr = canvasRef.current
    if (qr) {
      const dataUrl = qr.toDataURL('image/png')
      const img = new Image()
      await new Promise<void>((resolve) => {
        img.onload = () => { resolve() }
        img.src = dataUrl
      })
      const qrSize = 260
      ctx.drawImage(img, W - qrSize - 60, H - qrSize - 60, qrSize, qrSize)
    }
    // Footer brand
    ctx.font = '24px Inter, Arial'
    ctx.fillStyle = '#9CA3AF'
    ctx.fillText('afrigest.com', 60, H - 60)
    // Download
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `afrigest_ambassadeur_${code || 'code'}.png`
    a.click()
  }

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h5" gutterBottom>Devenez Ambassadeur</Typography>
      {message && <Typography color="text.secondary" sx={{ mb: 2 }}>{message}</Typography>}
      <Grid container spacing={3} sx={{ mb: 1 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Leads ce mois‑ci</Typography>
              <Typography variant="h4">{stats ? stats.leadsThisMonth : '…'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Leads totaux</Typography>
              <Typography variant="h4">{stats ? stats.totalLeads : '…'}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">Votre code parrain</Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <TextField size="small" value={code} InputProps={{ readOnly: true }} sx={{ flex: 1 }} />
                <IconButton onClick={() => copy(code)}><ContentCopyIcon /></IconButton>
                <IconButton onClick={onRegenerate}><RefreshIcon /></IconButton>
              </Stack>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Lien de partage</Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <TextField size="small" value={shareUrl} InputProps={{ readOnly: true }} sx={{ flex: 1 }} />
                <IconButton onClick={() => copy(shareUrl)}><ContentCopyIcon /></IconButton>
              </Stack>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Partage rapide</Typography>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button variant="outlined" startIcon={<WhatsAppIcon />} href={waLink} target="_blank">WhatsApp</Button>
                  <Button variant="outlined" startIcon={<EmailIcon />} href={mailto}>Email</Button>
                  <Button variant="outlined" startIcon={<LinkedInIcon />} href={linkedin} target="_blank">LinkedIn</Button>
                  <Button variant="contained" onClick={generateShareCard}>Carte de partage</Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary">QR Code</Typography>
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <canvas ref={canvasRef} />
                <Button variant="outlined" onClick={async () => {
                  if (!canvasRef.current) return
                  const url = canvasRef.current.toDataURL('image/png')
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `afrigest_ref_${code}.png`
                  a.click()
                }}>Télécharger</Button>
              </Box>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="outlined" href="/leads">Voir tous les leads</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600}>Leads récents (max 10)</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mt: 1 }}>
                <TextField label="Recherche" value={leadQuery} onChange={e => setLeadQuery(e.target.value)} sx={{ flex: 1 }} placeholder="Nom, entreprise, email…" />
                <TextField select label="Période" value={leadPeriod} onChange={e => setLeadPeriod(e.target.value as any)} sx={{ minWidth: 160 }}>
                  <MenuItem value="all">Toutes</MenuItem>
                  <MenuItem value="7">7 jours</MenuItem>
                  <MenuItem value="30">30 jours</MenuItem>
                </TextField>
              </Stack>
              <Box sx={{ mt: 2, overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Nom</TableCell>
                      <TableCell>Entreprise</TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Email</TableCell>
                      <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Téléphone</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {leads
                      .filter(l => {
                        const s = leadQuery.trim().toLowerCase()
                        if (!s) return true
                        return `${l.name} ${l.company} ${l.email}`.toLowerCase().includes(s)
                      })
                      .filter(l => {
                        if (leadPeriod === 'all') return true
                        const days = leadPeriod === '7' ? 7 : 30
                        return new Date(l.createdAt).getTime() >= Date.now() - days * 24 * 60 * 60 * 1000
                      })
                      .slice(page * pageSize, page * pageSize + pageSize)
                      .map(l => (
                        <TableRow key={l.id}>
                          <TableCell>{new Date(l.createdAt).toLocaleString()}</TableCell>
                          <TableCell>{l.name}</TableCell>
                          <TableCell>{l.company}</TableCell>
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{l.email}</TableCell>
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{l.phone || '-'}</TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={async () => { try { await navigator.clipboard.writeText(l.email) } catch {} }}><ContentCopyIcon fontSize="small" /></IconButton>
                            <Button size="small" href={`mailto:${encodeURIComponent(l.email)}?subject=${encodeURIComponent('Suivi demande de démo AfriGest')}`}>Email</Button>
                          </TableCell>
                        </TableRow>
                    ))}
                    {leads.length === 0 && (
                      <TableRow><TableCell colSpan={6}><Typography color="text.secondary">Aucun lead pour le moment.</Typography></TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mt: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button size="small" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Précédent</Button>
                  <Button size="small" onClick={() => setPage(p => p + 1)}>Suivant</Button>
                </Stack>
                <TextField select size="small" label="Taille" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0) }} sx={{ width: 120 }}>
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={25}>25</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                </TextField>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  )
}
