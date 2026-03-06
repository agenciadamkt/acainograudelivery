import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { StoreProvider } from "@/contexts/StoreContext";
import { CartProvider } from "@/contexts/CartContext";
import { PrinterProvider } from "@/contexts/PrinterContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PrivateRoute } from "@/components/PrivateRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";

import { ProtectedRoute } from "@/components/customer/ProtectedRoute";
import AppManager from "@/components/AppManager";
import CopilotPanel from "@/components/copilot/CopilotPanel";

// Helper that shows CopilotPanel only on admin pages
function GlobalCopilot() {
  const location = (window as any).__ROUTER_LOCATION__;
  // We render it always but it requires useLocation, so we put it inside BrowserRouter
  return <CopilotGlobalWrapper />;
}

function CopilotGlobalWrapper() {
  const { pathname } = useLocation();
  if (!pathname.startsWith('/admin/')) return null;
  // Don't show on login/signup pages
  if (pathname === '/admin/login' || pathname === '/admin/signup' || pathname === '/admin/reset-password') return null;
  return <CopilotPanel />;
}

// Client pages
import LocationState from "./pages/LocationState";
import LocationCity from "./pages/LocationCity";
import Searching from "./pages/Searching";
import StoreResult from "./pages/StoreResult";
import Stores from "./pages/Stores";
import Menu from "./pages/Menu";
import StoreMenu from "./pages/StoreMenu";
import Categories from "./pages/Categories";
import ProductDetail from "./pages/ProductDetail";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import Orders from "./pages/Orders";
import Install from "./pages/Install";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import OrderDetails from "./pages/OrderDetails";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import InfinitePaySuccess from "./pages/InfinitePaySuccess";

// Admin pages
import Login from "./pages/admin/Login";
import ResetPassword from "./pages/admin/ResetPassword";
import Signup from "./pages/admin/Signup";
import DriverLogin from "./pages/driver/DriverLogin";
import DriverDashboard from "./pages/driver/DriverDashboard";
import OrderTracking from "./pages/tracking/OrderTracking";
import Dashboard from "./pages/admin/Dashboard";
import FranchiseRequest from "./pages/FranchiseRequest";
import FranchiseesPage from "./pages/admin/franchisees/FranchiseesPage";
import CategoriesPage from "./pages/admin/categories/CategoriesPage";
import ProductsPage from "./pages/admin/products/ProductsPage";
import ToppingsPage from "./pages/admin/toppings/ToppingsPage";
import OrdersPage from "./pages/admin/orders/OrdersPage";
import KDSPage from "./pages/admin/kds/KDSPage";
import InventoryPage from "./pages/admin/inventory/InventoryPage";
import FinancialPage from "./pages/admin/financial/FinancialPage";
import CustomersPage from "./pages/admin/customers/CustomersPage";
import DeliveryPage from "./pages/admin/delivery/DeliveryPage";
import SettingsPage from "./pages/admin/settings/SettingsPage";
import DeliveryAreasPage from "./pages/admin/delivery/DeliveryAreasPage";
import MarketingPage from "./pages/admin/MarketingPage";
import FoodAnalyticsPage from "./pages/admin/FoodAnalyticsPage";
import FeedbackPage from "./pages/admin/feedback/FeedbackPage";
import GeocodingUtility from "./pages/admin/GeocodingUtility";
import PromotionsPage from "./pages/admin/promotions/PromotionsPage";
import Ingredientes from "./pages/admin/ingredientes/Ingredientes";

import NovaVenda from "./pages/admin/pdv/NovaVenda";
import Mesas from "./pages/admin/pdv/Mesas";
import Caixa from "./pages/admin/pdv/Caixa";
import Historico from "./pages/admin/pdv/Historico";
import Configuracoes from "./pages/admin/pdv/Configuracoes";
import Relatorios from "./pages/admin/pdv/Relatorios";

// GrauOS pages
import GrauOSHub from "./pages/admin/GrauOSHub";
import UniversidadePage from "./pages/admin/universidade/UniversidadePage";
import TrailDetailPage from "./pages/admin/universidade/TrailDetailPage";
import UniversidadeAdminPage from "./pages/admin/universidade/UniversidadeAdminPage";
import PerformancePage from "./pages/admin/performance/PerformancePage";
import AssistentePage from "./pages/admin/assistente/AssistentePage";
import ComunidadePage from "./pages/admin/comunidade/ComunidadePage";
import FluxoCaixaPage from "./pages/admin/financial/FluxoCaixaPage";
import WeeklyCashFlowPage from "./pages/admin/financial/WeeklyCashFlowPage";
import FinancialLayout from "./pages/admin/financial/FinancialLayout";
import FinancialDashboard from "./pages/admin/financial/FinancialDashboard";
import CashClosingsPage from "./pages/admin/financial/CashClosingsPage";
import CadastrosPage from "./pages/admin/financial/CadastrosPage";
import ExpensesPage from "./pages/admin/financial/ExpensesPage";
import DREReportPage from "./pages/admin/financial/DREReportPage";
import ReportsPage from "./pages/admin/financial/ReportsPage";
import MetasPage from "./pages/admin/financial/MetasPage";
import CaixaPage from "./pages/admin/financial/CaixaPage";
import RevenueExpenseReportPage from "./pages/admin/financial/RevenueExpenseReportPage";
import DetailedExpensesReportPage from "./pages/admin/financial/DetailedExpensesReportPage";
import AccountsReceivablePage from "./pages/admin/financial/AccountsReceivablePage";

import { ThemeProvider } from "next-themes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <AppManager />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ErrorBoundary>
            <AuthProvider>
              <StoreProvider>
                <CartProvider>
                  <PrinterProvider>
                    <CopilotGlobalWrapper />
                    <Routes>
                      {/* Client routes */}
                      <Route path="/" element={<LocationState />} />
                      <Route path="/location-city" element={<LocationCity />} />
                      <Route path="/searching" element={<Searching />} />
                      <Route path="/store-result" element={<StoreResult />} />
                      <Route path="/stores" element={<Stores />} />
                      <Route path="/menu" element={<Menu />} />
                      <Route path="/delivery/:slug" element={<StoreMenu />} />
                      <Route path="/delivery/:slug/categories" element={<Categories />} />
                      <Route path="/product/:id" element={<ProductDetail />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/install" element={<Install />} />
                      <Route path="/auth" element={<Auth />} />

                      {/* Protected client routes */}
                      <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
                      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                      <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                      <Route path="/order-details/:orderId" element={<ProtectedRoute><OrderDetails /></ProtectedRoute>} />
                      <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                      <Route path="/checkout/infinitepay/success" element={<ProtectedRoute><InfinitePaySuccess /></ProtectedRoute>} />
                      <Route path="/order-confirmation/:orderId" element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />

                      {/* Public Tracking Route (from Email/WhatsApp) */}
                      <Route path="/tracking/:orderId" element={<OrderTracking />} />

                      {/* Admin auth routes */}
                      <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
                      <Route path="/admin/login" element={<Login />} />
                      <Route path="/admin/reset-password" element={<ResetPassword />} />
                      <Route path="/admin/signup" element={<Signup />} />
                      <Route path="/franchise-request" element={<FranchiseRequest />} />

                      {/* Driver Module */}
                      <Route path="/driver/login" element={<DriverLogin />} />
                      <Route path="/driver/dashboard" element={<DriverDashboard />} />

                      {/* GrauOS Hub & Modules */}
                      <Route
                        path="/admin/hub"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <GrauOSHub />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/universidade"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <UniversidadePage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/universidade/admin"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <UniversidadeAdminPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/universidade/:trailId"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <TrailDetailPage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/performance"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <PerformancePage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/assistente"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <AssistentePage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/comunidade"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <ComunidadePage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/financeiro"
                        element={
                          <PrivateRoute>
                            <FinancialLayout />
                          </PrivateRoute>
                        }
                      >
                        <Route index element={<FinancialDashboard />} />
                        <Route path="lancamentos" element={<FluxoCaixaPage />} />
                        <Route path="fluxo-semanal" element={<WeeklyCashFlowPage />} />
                        <Route path="cadastros" element={<CadastrosPage />} />
                        <Route path="fluxo" element={<CashClosingsPage />} />
                        <Route path="despesas" element={<ExpensesPage />} />
                        <Route path="dre" element={<DREReportPage />} />
                        <Route path="relatorios" element={<ReportsPage />} />
                        <Route path="receitas-despesas" element={<RevenueExpenseReportPage />} />
                        <Route path="despesas-detalhadas" element={<DetailedExpensesReportPage />} />
                        <Route path="caixa" element={<CaixaPage />} />
                        <Route path="receber" element={<AccountsReceivablePage />} />

                        <Route path="configuracoes" element={<div className="p-8 text-center text-gray-400">Configurações — Em breve</div>} />
                      </Route>

                      {/* Franchise management */}
                      <Route path="/admin/franchisees" element={
                        <PrivateRoute requiredRole="franchisee_master">
                          <FranchiseesPage />
                        </PrivateRoute>
                      } />

                      {/* Admin protected routes */}
                      <Route
                        path="/admin/dashboard"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <AdminLayout>
                              <Dashboard />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/orders"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <OrdersPage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/kds"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <KDSPage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/menu/categories"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <CategoriesPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/menu/products"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <ProductsPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/menu/toppings"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <ToppingsPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/promotions"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <PromotionsPage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/inventory"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <InventoryPage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/financial"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <FinancialPage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/customers"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <CustomersPage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/delivery"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <DeliveryPage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/delivery/areas"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <DeliveryAreasPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/marketing"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <MarketingPage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/analytics"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <FoodAnalyticsPage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/feedback"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <FeedbackPage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/menu/ingredients"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <Ingredientes />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/settings"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <SettingsPage />
                          </PrivateRoute>
                        }
                      />

                      {/* PDV Module */}
                      <Route
                        path="/admin/pdv/nova-venda"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <AdminLayout>
                              <NovaVenda />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/pdv/mesas"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <AdminLayout>
                              <Mesas />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/pdv/caixa"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <AdminLayout>
                              <Caixa />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/pdv/historico"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <AdminLayout>
                              <Historico />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />

                      <Route
                        path="/admin/pdv/configuracoes"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <Configuracoes />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/pdv/relatorios"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <Relatorios />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />

                      <Route
                        path="/admin/geocoding"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <GeocodingUtility />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />

                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </PrinterProvider>
                </CartProvider>
              </StoreProvider>
            </AuthProvider>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
