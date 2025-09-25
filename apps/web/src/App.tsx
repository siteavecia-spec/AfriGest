import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import PosPage from './pages/Pos'
import StockPage from './pages/Stock'
import ProtectedByRole from './components/ProtectedByRole'
import SettingsPage from './pages/Settings'
import SuppliersPage from './pages/Suppliers'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import AmbassadorPage from './pages/Ambassador'
import LeadsPage from './pages/Leads'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AdminPasswordReset from './pages/AdminPasswordReset'
import UsersPage from './pages/Users'
import VerifyEmail from './pages/VerifyEmail'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pos" element={<PosPage />} />
          <Route element={<ProtectedByRole allow={["super_admin", "pdg", "dg"]} />}>
            <Route path="/stock" element={<StockPage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/ambassador" element={<AmbassadorPage />} />
            <Route path="/users" element={<UsersPage />} />
          </Route>
          <Route element={<ProtectedByRole allow={["super_admin", "pdg"]} />}>
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route element={<ProtectedByRole allow={["super_admin"]} />}>
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/admin/password-reset" element={<AdminPasswordReset />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
