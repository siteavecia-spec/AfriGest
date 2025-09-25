import { Alert, Collapse } from '@mui/material'
import { useEffect, useState } from 'react'

export default function OfflineBanner() {
  const [online, setOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return (
    <Collapse in={!online}>
      <Alert severity="warning" variant="filled">Vous êtes hors-ligne. Les opérations seront mises en file d'attente et synchronisées dès le retour de la connexion.</Alert>
    </Collapse>
  )
}
