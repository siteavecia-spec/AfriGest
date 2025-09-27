import { Alert, Box, Button, Typography } from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { parseError, humanizeError } from '../utils/error'

export default function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const parsed = parseError({ message })
  const text = humanizeError(parsed)
  const reqId = parsed.reqId
  return (
    <Alert severity={parsed.statusHint === 429 ? 'warning' : 'error'} sx={{ mb: 2 }}
      action={(
        <Box sx={{ display: 'flex', gap: 1 }}>
          {reqId ? (
            <Button size="small" variant="outlined" startIcon={<ContentCopyIcon fontSize="small" />} onClick={() => { try { navigator.clipboard.writeText(reqId) } catch {} }}>Copier ID</Button>
          ) : null}
          {onRetry && (
            <Button size="small" variant="outlined" onClick={onRetry}>Réessayer</Button>
          )}
        </Box>
      )}
    >
      <Typography sx={{ wordBreak: 'break-word' }}>{text}</Typography>
    </Alert>
  )
}
