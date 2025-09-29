import { useEffect, useRef, useState } from 'react'
import { Box, Button, Container, IconButton, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { CompanySettings, loadCompanySettings, saveCompanySettings } from '../utils/settings'
import { useBoutique } from '../context/BoutiqueContext'
import { loadCustomAttrs, saveCustomAttrs, type CustomAttr, type CustomAttrsMap } from '../utils/customAttrs'
import { listProductTemplates, addCustomProductAttribute, removeCustomProductAttribute, importProductsJson } from '../api/client_clean'
import DeleteIcon from '@mui/icons-material/Delete'

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings>(loadCompanySettings())
  const [message, setMessage] = useState<string | null>(null)
  const { boutiques } = useBoutique()
  const fileRef = useRef<HTMLInputElement>(null)
  const [templates, setTemplates] = useState<Array<{ key: string; name: string }>>([])
  const [customMap, setCustomMap] = useState<CustomAttrsMap>({})
  const [sectorKey, setSectorKey] = useState<string>('generic')
  // Server-backed custom attribute editor
  const [srvKey, setSrvKey] = useState('')
  const [srvLabel, setSrvLabel] = useState('')
  const [srvType, setSrvType] = useState<'string'|'number'|'date'|'text'>('string')
  const [srvRequired, setSrvRequired] = useState(false)
  const [srvRemoveKey, setSrvRemoveKey] = useState('')
  // Import CSV state
  const [importSectorKey, setImportSectorKey] = useState<string>('generic')
  const [importText, setImportText] = useState('')
  const [importing, setImporting] = useState(false)
  const [importInfo, setImportInfo] = useState<string | null>(null)

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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Devise" value={settings.currency || ''} onChange={e => setSettings({ ...settings, currency: e.target.value })} placeholder="Ex: XOF, GNF" sx={{ minWidth: 160 }} />
            <TextField label="TVA (%)" type="number" value={settings.vatRate ?? ''} onChange={e => setSettings({ ...settings, vatRate: Number(e.target.value) })} inputProps={{ min: 0, max: 100 }} sx={{ minWidth: 160 }} />
          </Stack>
          {/* Devise par boutique (optionnelle) */}
          <Box>
            <Typography variant="subtitle1" sx={{ mt: 2 }}>Devise par boutique (optionnel)</Typography>
            <Typography variant="caption" color="text.secondary">Par défaut, on utilise la devise société. Vous pouvez surcharger ici boutique par boutique et définir le nombre de décimales.</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {boutiques.map(b => {
                const current = (settings.boutiqueCurrencies || {})[b.id] || { currency: '', decimals: undefined }
                return (
                  <Stack key={b.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
                    <TextField label={`Boutique`} value={`${b.code ? b.code + ' — ' : ''}${b.name}`} InputProps={{ readOnly: true }} sx={{ minWidth: 260 }} />
                    <TextField label="Devise boutique" value={current.currency} placeholder={settings.currency || 'XOF'} onChange={e => {
                      const val = e.target.value
                      setSettings(prev => ({ ...prev, boutiqueCurrencies: { ...(prev.boutiqueCurrencies || {}), [b.id]: { currency: val, decimals: (prev.boutiqueCurrencies || {})[b.id]?.decimals } } }))
                    }} sx={{ minWidth: 160 }} />
                    <TextField label="Décimales" type="number" value={current.decimals ?? ''} placeholder="0" onChange={e => {
                      const num = e.target.value === '' ? undefined : Number(e.target.value)
                      setSettings(prev => ({ ...prev, boutiqueCurrencies: { ...(prev.boutiqueCurrencies || {}), [b.id]: { currency: ((prev.boutiqueCurrencies || {})[b.id]?.currency) || '', decimals: num } } }))
                    }} sx={{ width: 140 }} inputProps={{ min: 0, max: 4 }} />
                    <Button size="small" color="warning" onClick={() => {
                      setSettings(prev => {
                        const next = { ...(prev.boutiqueCurrencies || {}) }
                        delete next[b.id]
                        return { ...prev, boutiqueCurrencies: next }
                      })
                    }}>Réinitialiser</Button>
                  </Stack>
                )
              })}
            </Stack>
          </Box>
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

      {/* Server-backed custom attributes (persisted in DB) */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h5" gutterBottom>Champs personnalisés (serveur)</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Ajoutez des champs PDG persistés côté serveur pour le secteur sélectionné. Ils apparaîtront automatiquement dans les templates renvoyés par l'API.
        </Typography>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField select label="Secteur" value={sectorKey} onChange={e => setSectorKey(e.target.value)} sx={{ minWidth: 220 }}>
              {templates.map(t => (
                <MenuItem key={t.key} value={t.key}>{t.name}</MenuItem>
              ))}
              {templates.length === 0 && <MenuItem value="generic">Générique</MenuItem>}
            </TextField>
            <TextField label="Clé" value={srvKey} onChange={e => setSrvKey(e.target.value)} sx={{ minWidth: 180 }} />
            <TextField label="Libellé" value={srvLabel} onChange={e => setSrvLabel(e.target.value)} sx={{ flex: 1 }} />
            <TextField select label="Type" value={srvType} onChange={e => setSrvType(e.target.value as any)} sx={{ minWidth: 180 }}>
              <MenuItem value="string">Texte</MenuItem>
              <MenuItem value="number">Nombre</MenuItem>
              <MenuItem value="date">Date</MenuItem>
              <MenuItem value="text">Paragraphe</MenuItem>
            </TextField>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField select label="Obligatoire" value={srvRequired ? 'yes' : 'no'} onChange={e => setSrvRequired(e.target.value === 'yes')} sx={{ minWidth: 200 }}>
              <MenuItem value="no">Non</MenuItem>
              <MenuItem value="yes">Oui</MenuItem>
            </TextField>
            <Box sx={{ flex: 1 }} />
            <Button variant="contained" onClick={async () => {
              try {
                await addCustomProductAttribute({ sectorKey, key: srvKey.trim(), label: srvLabel.trim(), type: srvType, required: srvRequired })
                setMessage('Champ personnalisé ajouté côté serveur.')
                setSrvKey(''); setSrvLabel(''); setSrvRequired(false)
                setTimeout(() => setMessage(null), 2000)
              } catch (e: any) {
                setMessage(e?.message || 'Erreur ajout champ serveur')
              }
            }}>Ajouter (serveur)</Button>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Clé à supprimer (serveur)" value={srvRemoveKey} onChange={e => setSrvRemoveKey(e.target.value)} sx={{ minWidth: 260 }} />
            <Box sx={{ flex: 1 }} />
            <Button color="error" variant="outlined" onClick={async () => {
              try {
                await removeCustomProductAttribute(sectorKey, srvRemoveKey.trim())
                setMessage('Champ personnalisé supprimé côté serveur.')
                setSrvRemoveKey('')
                setTimeout(() => setMessage(null), 2000)
              } catch (e: any) {
                setMessage(e?.message || 'Erreur suppression champ serveur')
              }
            }}>Supprimer (serveur)</Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Import catalogue produits (CSV) */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h5" gutterBottom>Import Catalogue (CSV)</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Format conseillé: en-tête avec colonnes: sku,name,price,cost,barcode,taxRate, puis colonnes d'attributs selon le secteur (ex: brand,model,serial,warranty pour Électronique).
        </Typography>
        <Stack spacing={2}>
          <TextField select label="Secteur" value={importSectorKey} onChange={e => setImportSectorKey(e.target.value)} sx={{ maxWidth: 360 }}>
            {templates.map(t => (
              <MenuItem key={t.key} value={t.key}>{t.name}</MenuItem>
            ))}
            {templates.length === 0 && <MenuItem value="generic">Générique</MenuItem>}
          </TextField>
          <Typography variant="body2">Collez ici votre CSV (séparateur virgule). Exemple:</Typography>
          <TextField multiline minRows={5} placeholder="sku,name,price,cost,barcode,taxRate,brand,model,serial,warranty\nSOL500,Solar 500,89900,65000,1234567890123,18,SolarTech,500,ABC123,24" value={importText} onChange={e => setImportText(e.target.value)} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => setImportText('')}>Effacer</Button>
              <Button variant="outlined" onClick={() => {
                try {
                  const sample = 'sku,name,price,cost,barcode,taxRate,brand,model,serial,warranty\nSOL500,Solar 500,89900,65000,1234567890123,18,SolarTech,500,ABC123,24'
                  setImportText(sample)
                } catch {}
              }}>Exemple</Button>
            </Stack>
            <Box sx={{ flex: 1 }} />
            <Button variant="text" component="label">
              Charger CSV/XLSX (fichier)
              <input hidden type="file" accept=".csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx" onChange={async (e) => {
                try {
                  const file = e.target.files?.[0]
                  if (!file) return
                  const name = (file.name || '').toLowerCase()
                  if (name.endsWith('.csv')) {
                    const text = await file.text()
                    setImportText(text)
                    return
                  }
                  if (name.endsWith('.xlsx')) {
                    // Dynamic load SheetJS from CDN
                    async function loadXlsx() {
                      return new Promise<any>((resolve, reject) => {
                        const id = 'sheetjs-cdn'
                        if (document.getElementById(id)) return resolve((window as any).XLSX)
                        const s = document.createElement('script')
                        s.id = id
                        s.src = 'https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js'
                        s.onload = () => resolve((window as any).XLSX)
                        s.onerror = reject
                        document.body.appendChild(s)
                      })
                    }
                    const XLSX = await loadXlsx()
                    const data = await file.arrayBuffer()
                    const wb = XLSX.read(data, { type: 'array' })
                    const wsName = wb.SheetNames[0]
                    const ws = wb.Sheets[wsName]
                    const csv = XLSX.utils.sheet_to_csv(ws)
                    setImportText(csv)
                  }
                } catch {}
              }} />
            </Button>
            <Button variant="contained" disabled={importing || !importText.trim()} onClick={async () => {
              try {
                setImporting(true); setImportInfo(null)
                const lines = importText.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
                if (lines.length < 2) throw new Error('Fournissez au moins 2 lignes (en-tête + données)')
                const header = lines[0].split(',').map(h => h.trim())
                const items = lines.slice(1).map(l => l.split(',')).map(cols => {
                  const row: Record<string, string> = {}
                  header.forEach((h, i) => { row[h] = (cols[i] || '').trim() })
                  const base: any = {
                    sku: row['sku'],
                    name: row['name'],
                    price: Number(row['price'] || 0),
                    cost: Number(row['cost'] || 0),
                    barcode: row['barcode'] || undefined,
                    taxRate: row['taxRate'] != null && row['taxRate'] !== '' ? Number(row['taxRate']) : undefined,
                    attrs: {}
                  }
                  // attrs = any column not in base keys
                  const baseKeys = new Set(['sku','name','price','cost','barcode','taxRate'])
                  Object.keys(row).forEach(k => { if (!baseKeys.has(k) && row[k] !== undefined && row[k] !== '') (base.attrs as any)[k] = row[k] })
                  return base
                })
                const res = await importProductsJson(importSectorKey, items)
                setImportInfo(`Créés: ${res.createdCount} • Erreurs: ${res.errorCount}`)
              } catch (e: any) {
                setImportInfo(e?.message || 'Erreur import')
              } finally {
                setImporting(false)
              }
            }}>Importer</Button>
            {importInfo && <Typography color="text.secondary">{importInfo}</Typography>}
          </Stack>
        </Stack>
      </Paper>
    </Container>
  )
}
