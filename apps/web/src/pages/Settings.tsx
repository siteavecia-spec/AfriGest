import { useEffect, useRef, useState } from 'react'
import { Box, Button, Container, IconButton, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { CompanySettings, loadCompanySettings, saveCompanySettings } from '../utils/settings'
import { loadCustomAttrs, saveCustomAttrs, type CustomAttr, type CustomAttrsMap } from '../utils/customAttrs'
import { listProductTemplates } from '../api/client_clean'
import DeleteIcon from '@mui/icons-material/Delete'

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings>(loadCompanySettings())
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [templates, setTemplates] = useState<Array<{ key: string; name: string }>>([])
  const [customMap, setCustomMap] = useState<CustomAttrsMap>({})
  const [sectorKey, setSectorKey] = useState<string>('generic')

  useEffect(() => {
    setSettings(loadCompanySettings())
    setCustomMap(loadCustomAttrs())
    ;(async () => {
      try {
        const t = await listProductTemplates()
        setTemplates(t.map((x: any) => ({ key: x.key, name: x.name })))
      } catch {}
    })()
  }, [])

  const onSave = (e: React.FormEvent) => {
    e.preventDefault()
    saveCompanySettings(settings)
    setMessage('Paramètres enregistrés.')
    setTimeout(() => setMessage(null), 2000)
  }

  const onPickLogo = () => {
    fileRef.current?.click()
  }

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setSettings(prev => ({ ...prev, logoDataUrl: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  return (
    <Container sx={{ py: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Paramètres Société</Typography>
        {message && <Typography color="text.secondary" sx={{ mb: 2 }}>{message}</Typography>}
        <Stack spacing={2} component="form" onSubmit={onSave}>
          <TextField label="Nom de l'entreprise" value={settings.name} onChange={e => setSettings({ ...settings, name: e.target.value })} required />
          <TextField label="Slogan" value={settings.slogan || ''} onChange={e => setSettings({ ...settings, slogan: e.target.value })} />
          <TextField label="Adresse" value={settings.address || ''} onChange={e => setSettings({ ...settings, address: e.target.value })} />
          <TextField label="Téléphone" value={settings.phone || ''} onChange={e => setSettings({ ...settings, phone: e.target.value })} />
          <TextField label="Préfixe des reçus" value={settings.receiptPrefix || ''} onChange={e => setSettings({ ...settings, receiptPrefix: e.target.value })} helperText="Ex: AG- ou CODE-BQ-" />
          <Box>
            <Button variant="outlined" onClick={onPickLogo}>Choisir un logo</Button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFileChange} />
          </Box>
          {settings.logoDataUrl && (
            <Box>
              <img src={settings.logoDataUrl} alt="logo" style={{ height: 64, borderRadius: 8 }} />
            </Box>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" type="submit">Enregistrer</Button>
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h5" gutterBottom>Attributs personnalisés par secteur (PDG)</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>Ces attributs s'ajoutent aux templates sectoriels pour la création de produits.</Typography>
        <Stack spacing={2}>
          <TextField select label="Secteur" value={sectorKey} onChange={e => setSectorKey(e.target.value)} sx={{ maxWidth: 360 }}>
            {templates.map(t => (
              <MenuItem key={t.key} value={t.key}>{t.name}</MenuItem>
            ))}
            {templates.length === 0 && <MenuItem value="generic">Générique</MenuItem>}
          </TextField>

          <Stack spacing={1}>
            {(customMap[sectorKey] || []).map((attr: CustomAttr, idx: number) => (
              <Stack key={`${attr.key}-${idx}`} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                <TextField label="Clé" value={attr.key} onChange={e => {
                  setCustomMap(prev => {
                    const list = [...(prev[sectorKey] || [])]
                    list[idx] = { ...list[idx], key: e.target.value }
                    return { ...prev, [sectorKey]: list }
                  })
                }} sx={{ minWidth: 160 }} />
                <TextField label="Libellé" value={attr.label} onChange={e => {
                  setCustomMap(prev => {
                    const list = [...(prev[sectorKey] || [])]
                    list[idx] = { ...list[idx], label: e.target.value }
                    return { ...prev, [sectorKey]: list }
                  })
                }} sx={{ flex: 1 }} />
                <TextField select label="Type" value={attr.type} onChange={e => {
                  setCustomMap(prev => {
                    const list = [...(prev[sectorKey] || [])]
                    list[idx] = { ...list[idx], type: e.target.value as any }
                    return { ...prev, [sectorKey]: list }
                  })
                }} sx={{ minWidth: 160 }}>
                  <MenuItem value="string">Texte</MenuItem>
                  <MenuItem value="number">Nombre</MenuItem>
                  <MenuItem value="date">Date</MenuItem>
                  <MenuItem value="text">Paragraphe</MenuItem>
                </TextField>
                <IconButton color="error" onClick={() => {
                  setCustomMap(prev => {
                    const list = [...(prev[sectorKey] || [])]
                    list.splice(idx, 1)
                    return { ...prev, [sectorKey]: list }
                  })
                }}><DeleteIcon /></IconButton>
              </Stack>
            ))}
            <Box>
              <Button variant="outlined" onClick={() => {
                setCustomMap(prev => ({ ...prev, [sectorKey]: [...(prev[sectorKey] || []), { key: '', label: '', type: 'string' }] }))
              }}>Ajouter un attribut</Button>
            </Box>
          </Stack>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" onClick={() => { saveCustomAttrs(customMap); setMessage('Attributs personnalisés enregistrés.'); setTimeout(() => setMessage(null), 2000) }}>Enregistrer les attributs</Button>
          </Box>
        </Stack>
      </Paper>
    </Container>
  )
}
