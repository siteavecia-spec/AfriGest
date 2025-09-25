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
import EcommerceOverview from './pages/Ecommerce/Overview'
import EcommerceProducts from './pages/Ecommerce/Products'
import EcommerceOrders from './pages/Ecommerce/Orders'
import EcommerceSettings from './pages/Ecommerce/Settings'
import EcommerceCustomers from './pages/Ecommerce/Customers'
import Conversations from './pages/Messaging/Conversations'
import Chat from './pages/Messaging/Chat'
import PresencePage from './pages/Messaging/Presence'
import { showEcommerce, showMessaging } from './config/featureFlags'

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
            {/* Messaging module (feature flag) */}
            {showMessaging && (
              <>
                <Route path="/messaging" element={<Conversations />} />
                <Route path="/messaging/:userId" element={<Chat />} />
                <Route path="/messaging/presence" element={<PresencePage />} />
              </>
            )}
            {/* Ecommerce module */}
            {showEcommerce && (
              <>
                <Route path="/ecommerce" element={<EcommerceOverview />} />
                <Route path="/ecommerce/products" element={<EcommerceProducts />} />
                <Route path="/ecommerce/orders" element={<EcommerceOrders />} />
                <Route path="/ecommerce/customers" element={<EcommerceCustomers />} />
              </>
            )}
          </Route>
          <Route element={<ProtectedByRole allow={["super_admin", "pdg"]} />}>
            <Route path="/settings" element={<SettingsPage />} />
            {/* Ecommerce settings (PDG/Super Admin) */}
            {showEcommerce && <Route path="/ecommerce/settings" element={<EcommerceSettings />} />}
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

