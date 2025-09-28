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
import SalesPage from './pages/Sales'
import TransfersPage from './pages/Transfers'
import BoutiquesPage from './pages/Boutiques'
import RestockPage from './pages/Restock'
import InventoryPage from './pages/Inventory'
import EcommerceOverview from './pages/Ecommerce/Overview'
import EcommerceProducts from './pages/Ecommerce/Products'
import EcommerceOrders from './pages/Ecommerce/Orders'
import EcommerceSettings from './pages/Ecommerce/Settings'
import EcommerceCustomers from './pages/Ecommerce/Customers'
import Conversations from './pages/Messaging/Conversations'
import Chat from './pages/Messaging/Chat'
import PresencePage from './pages/Messaging/Presence'
import { showEcommerce, showMessaging } from './config/featureFlags'
import DevToolsPage from './pages/DevTools'
import StorefrontCatalog from './pages/Storefront/Catalog'
import StorefrontCart from './pages/Storefront/Cart'
import StorefrontCheckout from './pages/Storefront/Checkout'
import PrivacyPage from './pages/Privacy'
import TermsPage from './pages/Terms'
import LegalPage from './pages/Legal'
import SecurityPage from './pages/Security'
import ThankYouPage from './pages/ThankYou'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedByPermission from './components/ProtectedByPermission'
import CompaniesAdminPage from './pages/Admin/Companies'
import SuperAdminConsole from './pages/Admin/SuperAdminConsole'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ErrorBoundary><LandingPage /></ErrorBoundary>} />
      {/* Public storefront (MVP) */}
      <Route path="/shop" element={<StorefrontCatalog />} />
      <Route path="/shop/cart" element={<StorefrontCart />} />
      <Route path="/shop/checkout" element={<StorefrontCheckout />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/legal" element={<LegalPage />} />
      <Route path="/security" element={<ErrorBoundary><SecurityPage /></ErrorBoundary>} />
      <Route path="/thank-you" element={<ErrorBoundary><ThankYouPage /></ErrorBoundary>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pos" element={<PosPage />} />
          <Route element={<ProtectedByRole allow={["super_admin", "pdg", "dg"]} />}>
            <Route element={<ProtectedByPermission moduleKey="stock" action="read" />}> 
              <Route path="/stock" element={<StockPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
            </Route>
            <Route element={<ProtectedByPermission moduleKey="suppliers" action="read" />}> 
              <Route path="/suppliers" element={<SuppliersPage />} />
            </Route>
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/transfers" element={<TransfersPage />} />
            <Route path="/boutiques" element={<BoutiquesPage />} />
            <Route path="/restock" element={<RestockPage />} />
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
                <Route element={<ProtectedByPermission moduleKey="ecommerce.products" action="read" />}> 
                  <Route path="/ecommerce/products" element={<EcommerceProducts />} />
                </Route>
                <Route element={<ProtectedByPermission moduleKey="ecommerce.orders" action="read" />}> 
                  <Route path="/ecommerce/orders" element={<EcommerceOrders />} />
                </Route>
                <Route path="/ecommerce/customers" element={<EcommerceCustomers />} />
              </>
            )}
          </Route>
          <Route element={<ProtectedByRole allow={["super_admin", "pdg"]} />}>
            <Route element={<ProtectedByPermission moduleKey="settings" action="read" />}> 
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            {/* Ecommerce settings (PDG/Super Admin) */}
            {showEcommerce && (
              <Route element={<ProtectedByPermission moduleKey="ecommerce.settings" action="read" />}> 
                <Route path="/ecommerce/settings" element={<EcommerceSettings />} />
              </Route>
            )}
            {/* Dev Tools (Phase 1 QA) */}
            <Route path="/dev-tools" element={<DevToolsPage />} />
          </Route>
          <Route element={<ProtectedByRole allow={["super_admin"]} />}>
            <Route path="/admin/console" element={<SuperAdminConsole />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/admin/password-reset" element={<AdminPasswordReset />} />
            <Route path="/admin/companies" element={<CompaniesAdminPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

