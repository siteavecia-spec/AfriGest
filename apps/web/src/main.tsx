import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { CssBaseline, ThemeProvider } from '@mui/material'
import App from './App'
import { store } from './store'
import { theme } from './theme'
import { setupOfflineSync } from './offline/salesQueue'
import { BoutiqueProvider } from './context/BoutiqueContext'
import ConsentBanner from './utils/privacy/ConsentBanner'
import { I18nProvider } from './i18n/i18n'

// Initialize offline sync once at startup
setupOfflineSync()

// Register service worker for PWA (only in production and if supported)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = '/sw.js'
    navigator.serviceWorker.register(swUrl).catch(() => {
      // ignore registration errors in dev
    })
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <I18nProvider>
            <BoutiqueProvider>
              <App />
              <ConsentBanner />
            </BoutiqueProvider>
          </I18nProvider>
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)
