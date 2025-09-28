import { createTheme } from '@mui/material/styles'

export function getTheme(mode: 'light' | 'dark' = 'light') {
  const isDark = mode === 'dark'
  return createTheme({
    palette: {
      mode,
      primary: { main: '#1D4ED8' },
      secondary: { main: '#059669' },
      success: { main: '#10B981' },
      error: { main: '#EF4444' },
      warning: { main: '#F59E0B' },
      info: { main: '#3B82F6' },
      text: isDark ? { primary: '#F9FAFB', secondary: '#D1D5DB' } : { primary: '#111827', secondary: '#6B7280' },
      background: isDark ? { default: '#0B1220', paper: '#0F172A' } : { default: '#FFFFFF', paper: '#FFFFFF' },
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
    shape: { borderRadius: 8 },
    spacing: 8,
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 8, textTransform: 'none' },
          containedPrimary: { ':hover': { backgroundColor: '#1E40AF' } },
          containedSecondary: { ':hover': { backgroundColor: '#047857' } }
        }
      },
      MuiPaper: { styleOverrides: { root: { borderRadius: 8 } } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 4, height: 40 },
          notchedOutline: { borderColor: isDark ? '#334155' : '#E5E7EB' },
          input: { padding: '10px 12px' }
        }
      },
      MuiFormLabel: { styleOverrides: { root: { color: isDark ? '#E5E7EB' : '#111827' } } },
      MuiLink: { styleOverrides: { root: { color: '#93C5FD' } } }
    }
  })
}

// Backward compatibility default theme (light)
export const theme = getTheme('light')
