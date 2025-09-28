import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { getTheme } from '../theme'

export type ThemeMode = 'light' | 'dark'

type Ctx = {
  mode: ThemeMode
  toggle: () => void
  setMode: (m: ThemeMode) => void
}

const ThemeModeContext = createContext<Ctx | undefined>(undefined)

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext)
  if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider')
  return ctx
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light')

  // Load initial mode from localStorage or prefers-color-scheme
  useEffect(() => {
    try {
      const saved = (localStorage.getItem('afrigest_theme') || '') as ThemeMode
      if (saved === 'dark' || saved === 'light') {
        setModeState(saved)
        return
      }
    } catch {}
    // Fallback: system preference
    try {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      setModeState(prefersDark ? 'dark' : 'light')
    } catch {
      setModeState('light')
    }
  }, [])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    try { localStorage.setItem('afrigest_theme', m) } catch {}
  }, [])

  const toggle = useCallback(() => {
    setMode(prev => {
      const next = prev === 'light' ? 'dark' : 'light'
      try { localStorage.setItem('afrigest_theme', next) } catch {}
      return next
    })
  }, [])

  const theme = useMemo(() => getTheme(mode), [mode])

  const value = useMemo(() => ({ mode, toggle, setMode }), [mode, toggle, setMode])

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}
