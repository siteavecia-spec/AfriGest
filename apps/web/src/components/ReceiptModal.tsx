import { Avatar, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from '@mui/material'
import { useRef } from 'react'

export interface ReceiptItem {
  sku: string
  name: string
  quantity: number
  unitPrice: number
  total: number
  discount?: number
}

export interface ReceiptData {
  id?: string
  boutiqueId: string
  createdAt: string
  currency: string
  paymentMethod: string
  paymentRef?: string
  payments?: Array<{ method: string; amount: number; ref?: string }>
  items: ReceiptItem[]
  total: number
  offlineId?: string
  brand?: {
    name: string
    slogan?: string
    address?: string
    phone?: string
    logoDataUrl?: string
  }
  receiptNumber?: string
  vatRate?: number
  vatAmount?: number
  totalExclVat?: number
  totalInclVat?: number
  vatSummary?: Array<{ rate: number; amount: number }>
}

export default function ReceiptModal({ open, onClose, data }: { open: boolean; onClose: () => void; data: ReceiptData | null }) {
  const contentRef = useRef<HTMLDivElement | null>(null)
  const handlePrint = () => {
    window.print()
  }

  const handleExportPdf = async () => {
    if (!contentRef.current) return
    // Lazy import to avoid loading unless needed
    const [{ default: html2canvas }, jsPDFModule] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ])
    const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default
    const node = contentRef.current
    const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff' })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pageWidth - 40
    const imgHeight = canvas.height * (imgWidth / canvas.width)
    let y = 20
    if (imgHeight < pageHeight - 40) {
      pdf.addImage(imgData, 'PNG', 20, y, imgWidth, imgHeight)
    } else {
      // Split into multiple pages vertically
      let position = 0
      while (position < imgHeight) {
        pdf.addImage(imgData, 'PNG', 20, y - position, imgWidth, imgHeight)
        position += pageHeight - 40
        if (position < imgHeight) pdf.addPage()
      }
    }
    const fileName = `receipt_${data?.receiptNumber || data?.id || data?.offlineId || 'afrigest'}.pdf`
    pdf.save(fileName)
  }

  if (!data) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Reçu {data.receiptNumber ? `#${data.receiptNumber}` : ''} {data.id ? `(ID ${data.id})` : data.offlineId ? `(Hors-ligne ${data.offlineId})` : ''}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1} ref={contentRef}>
          {data.brand && (
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
              {data.brand.logoDataUrl && <Avatar variant="rounded" src={data.brand.logoDataUrl} alt={data.brand.name} sx={{ width: 48, height: 48 }} />}
              <Stack>
                <Typography variant="subtitle1" fontWeight={700}>{data.brand.name}</Typography>
                {data.brand.slogan && <Typography variant="body2" color="text.secondary">{data.brand.slogan}</Typography>}
                {(data.brand.address || data.brand.phone) && (
                  <Typography variant="caption" color="text.secondary">
                    {data.brand.address}{data.brand.address && data.brand.phone ? ' • ' : ''}{data.brand.phone}
                  </Typography>
                )}
              </Stack>
            </Stack>
          )}
          <Typography variant="body2" color="text.secondary">Boutique: {data.boutiqueId} • {new Date(data.createdAt).toLocaleString()}</Typography>
          <Divider />
          {data.items.map((it, idx) => (
            <Stack key={idx} direction="row" justifyContent="space-between">
              <Typography sx={{ minWidth: 140 }}>{it.sku}</Typography>
              <Typography sx={{ flex: 1 }}>{it.name}</Typography>
              <Typography>x{it.quantity}</Typography>
              <Typography>{it.unitPrice.toFixed(2)}</Typography>
              <Typography>= {(it.total).toFixed(2)} {data.currency}</Typography>
            </Stack>
          ))}
          <Divider />
          {data.vatRate != null ? (
            <>
              <Typography variant="body2" color="text.secondary" textAlign="right">HT: {(data.totalExclVat ?? (data.total - (data.vatAmount || 0))).toFixed(2)} {data.currency}</Typography>
              <Typography variant="body2" color="text.secondary" textAlign="right">TVA ({data.vatRate}%): {(data.vatAmount ?? 0).toFixed(2)} {data.currency}</Typography>
              <Typography variant="h6" textAlign="right">TTC: {(data.totalInclVat ?? data.total).toFixed(2)} {data.currency}</Typography>
              {Array.isArray(data.vatSummary) && data.vatSummary.length > 0 && (
                <Stack sx={{ mt: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" textAlign="right">Détail TVA par taux:</Typography>
                  {data.vatSummary.map((v, idx) => (
                    <Typography key={`${v.rate}-${idx}`} variant="caption" color="text.secondary" textAlign="right">{v.rate}%: {v.amount.toFixed(2)} {data.currency}</Typography>
                  ))}
                </Stack>
              )}
            </>
          ) : (
            <Typography variant="h6" textAlign="right">Total: {data.total.toFixed(2)} {data.currency}</Typography>
          )}
          {Array.isArray(data.payments) && data.payments.length > 0 ? (
            <Stack>
              <Typography variant="subtitle2" textAlign="right">Paiements</Typography>
              {data.payments.map((p, i) => (
                <Typography key={i} variant="body2" color="text.secondary" textAlign="right">
                  {p.method}: {p.amount.toFixed(2)} {data.currency}{p.ref ? ` • Réf: ${p.ref}` : ''}
                </Typography>
              ))}
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary" textAlign="right">Paiement: {data.paymentMethod}{data.paymentRef ? ` • Réf: ${data.paymentRef}` : ''}</Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
        <Button onClick={handleExportPdf}>Exporter PDF</Button>
        <Button variant="contained" onClick={handlePrint}>Imprimer</Button>
      </DialogActions>
    </Dialog>
  )
}
