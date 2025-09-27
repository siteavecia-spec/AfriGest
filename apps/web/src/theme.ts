import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1D4ED8' }, // Bleu primaire
    secondary: { main: '#059669' }, // Vert primaire (succès)
    success: { main: '#10B981' },
    error: { main: '#EF4444' },
    warning: { main: '#F59E0B' },
    info: { main: '#3B82F6' },
    text: { primary: '#111827', secondary: '#6B7280' },
    background: { default: '#FFFFFF', paper: '#FFFFFF' },
    grey: {
      50: '#F9FAFB',
      200: '#E5E7EB',
      500: '#6B7280',
      900: '#111827'
    }
  },
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
    h1: { fontSize: '2.5rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' },
    h2: { fontSize: '2rem', fontWeight: 600, lineHeight: 1.3, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.4 },
    h4: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.5 },
    h5: { fontSize: '1.125rem', fontWeight: 500, lineHeight: 1.6 },
    body1: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.6 },
    body2: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.5 },
    caption: { fontSize: '0.75rem', fontWeight: 400, lineHeight: 1.4, letterSpacing: '0.01em' }
  },
  shape: {
    borderRadius: 8 // Medium par défaut
  },
  spacing: 8, // Échelle 8px
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, textTransform: 'none' },
        containedPrimary: { ':hover': { backgroundColor: '#1E40AF' } },
        containedSecondary: { ':hover': { backgroundColor: '#047857' } }
      }
    },
    MuiPaper: {
      styleOverrides: { root: { borderRadius: 8 } }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 4, height: 40 },
        notchedOutline: { borderColor: '#E5E7EB' },
        input: { padding: '10px 12px' }
      }
    },
    MuiFormLabel: {
      styleOverrides: { root: { color: '#111827' } }
    },
    MuiLink: {
      styleOverrides: { root: { color: '#1D4ED8' } }
    }
  }
})
