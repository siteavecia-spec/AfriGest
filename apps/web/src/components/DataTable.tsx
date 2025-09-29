import { Paper, Table, TableBody, TableCell, TableHead, TableRow, Box, Typography, CircularProgress, TableContainer } from '@mui/material'
import { ReactNode } from 'react'

interface DataTableProps {
  columns: Array<{ key: string; label: string; align?: 'left'|'right'|'center' }>
  rows: any[]
  children?: ReactNode // optional custom body (overrides rows)
  loading?: boolean
  error?: string | null
  emptyMessage?: string
  size?: 'small' | 'medium'
  stickyHeader?: boolean
  hover?: boolean
  containerMaxHeight?: number | string
}

export default function DataTable({ columns, rows, children, loading, error, emptyMessage = 'Aucune donnée', size = 'small', stickyHeader = false, hover = true, containerMaxHeight = 520 }: DataTableProps) {
  return (
    <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
      {error && (
        <Box sx={{ p: 2 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}
      {!error && (
        <TableContainer sx={{ maxHeight: containerMaxHeight }}>
          <Table size={size} stickyHeader={stickyHeader}>
            <TableHead>
              <TableRow>
                {columns.map(col => (
                  <TableCell key={col.key} align={col.align || 'left'}>{col.label}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} align="center">
                    <Box sx={{ py: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <CircularProgress size={18} />
                      <Typography variant="body2" color="text.secondary">Chargement…</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (children ? children : (
                rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center">
                      <Typography color="text.secondary" sx={{ py: 2 }}>{emptyMessage}</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, idx) => (
                    <TableRow key={r.id || idx} hover={hover}>
                      {columns.map(col => (
                        <TableCell key={col.key} align={col.align || 'left'}>
                          {String(r[col.key] ?? '')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  )
}

