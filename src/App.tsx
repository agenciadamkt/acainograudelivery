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
import { GlobalFranchiseeOrderAlert } from "@/components/admin/GlobalFranchiseeOrderAlert";

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
import UpdatePasswordPage from "./pages/admin/UpdatePasswordPage";
import Signup from "./pages/admin/Signup";
import DriverLogin from "./pages/driver/DriverLogin";
import DriverDashboard from "./pages/driver/DriverDashboard";
import MotoristaLogin from "./pages/frota/MotoristaLogin";
import MotoristaDashboard from "./pages/frota/MotoristaDashboard";
import OrderTracking from "./pages/tracking/OrderTracking";
import Dashboard from "./pages/admin/Dashboard";
import FranchiseRequest from "./pages/FranchiseRequest";
import FranchiseesPage from "./pages/admin/franchisees/FranchiseesPage";
import CategoriesPage from "./pages/admin/categories/CategoriesPage";
import ProductsPage from "./pages/admin/products/ProductsPage";
import ToppingsPage from "./pages/admin/toppings/ToppingsPage";
import OrdersPage from "./pages/admin/orders/OrdersPage";
import KDSPage from "./pages/admin/kds/KDSPage";
// Removed old InventoryPage import to avoid conflict with StockInventoryPage
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
import HistoricoTurnos from "./pages/admin/pdv/HistoricoTurnos";
import DetalheTurno from "./pages/admin/pdv/DetalheTurno";
import Historico from "./pages/admin/pdv/Historico";
import ExtratoFinanceiro from "./pages/admin/pdv/ExtratoFinanceiro";
import Configuracoes from "./pages/admin/pdv/Configuracoes";
import DadosLojaPage from "./pages/admin/loja/DadosLojaPage";
import Relatorios from "./pages/admin/pdv/Relatorios";

// GrauOS pages
import GrauOSHub from "./pages/admin/GrauOSHub";
import HubPreviewPage from "./pages/admin/HubPreviewPage";
import UniversidadePage from "./pages/admin/universidade/UniversidadePage";
import TrailDetailPage from "./pages/admin/universidade/TrailDetailPage";
import UniversidadeAdminPage from "./pages/admin/universidade/UniversidadeAdminPage";
import PerformancePage from "./pages/admin/performance/PerformancePage";
import AssistentePage from "./pages/admin/assistente/AssistentePage";
import ComunidadePage from "./pages/admin/comunidade/ComunidadePage";
import FrotaPage from "./pages/admin/frota/FrotaPage";
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
import OrderCatalog from "./pages/admin/orders/OrderCatalog";
import FranchiseeProductsPage from "./pages/admin/orders/FranchiseeProductsPage";
import OrderManagement from "./pages/admin/orders/OrderManagement";
import OrdersReportsPage from "./pages/admin/orders/OrdersReportsPage";
import OrderHistory from "./pages/admin/orders/OrderHistory";
import CheckoutPage from "./pages/admin/orders/CheckoutPage";
import FranchiseeOrderDetails from "./pages/admin/orders/FranchiseeOrderDetails";
import FranchiseeProductDetail from "./pages/admin/orders/FranchiseeProductDetail";
import GrauzinhoPage from "./pages/admin/game/GrauzinhoPage";

// CAF — Central de Atendimento ao Franqueado
import CAFDashboard from "./pages/admin/caf/CAFDashboard";
import AtendimentosPage from "./pages/admin/caf/AtendimentosPage";
import BaseConhecimentoPage from "./pages/admin/caf/BaseConhecimentoPage";
import RelatoriosCAFPage from "./pages/admin/caf/RelatoriosCAFPage";
import CadastrosCAFPage from "./pages/admin/caf/CadastrosCAFPage";
import CAFConnectPage from "./pages/admin/caf/connect/CAFConnectPage";
import AgendaDashboardPage from "./pages/admin/agenda/AgendaDashboardPage";
import CalendarioAgendaPage from "./pages/admin/agenda/CalendarioAgendaPage";
import MinhaAgendaPage from "./pages/admin/agenda/MinhaAgendaPage";
import EquipeAgendaPage from "./pages/admin/agenda/EquipeAgendaPage";
import CompromissosPage from "./pages/admin/agenda/CompromissosPage";
import RelatoriosAgendaPage from "./pages/admin/agenda/RelatoriosAgendaPage";
import SatisfacaoPublicaPage from "./pages/public/SatisfacaoPublicaPage";
import PortalFranqueadoPage from "./pages/public/PortalFranqueadoPage";

// Stock Management Module
import StockInventoryPage from "./pages/admin/stock/InventoryPage";
import StockDashboardPage from "./pages/admin/stock/DashboardPage";
import StockMovementsPage from "./pages/admin/stock/MovementsPage";
import StockCMVPage from "./pages/admin/stock/CMVPage";
import StockPurchasesPage from "./pages/admin/stock/PurchasesPage";
import StockCountsPage from "./pages/admin/stock/CountsPage";
import StockRecipesPage from "./pages/admin/stock/RecipesPage";
import PurchaseHistoryPage from "./pages/admin/stock/PurchaseHistoryPage";
import ChecklistAdminPage from "./pages/admin/stock/ChecklistAdminPage";
import ChecklistExecutionPage from "./pages/admin/stock/ChecklistExecutionPage";
import ChecklistReportsPage from "./pages/admin/stock/ChecklistReportsPage";
import CountGroupsPage from "./pages/admin/stock/CountGroupsPage";
import RecurringCountsPage from "./pages/admin/stock/RecurringCountsPage";
import RecurringCountExecutionPage from "./pages/admin/stock/RecurringCountExecutionPage";
import StockHelpPage from "./pages/admin/stock/HelpPage";
import BonificacoesPage from "./pages/admin/stock/BonificacoesPage";
import StockBalancePage from "./pages/admin/stock/BalancePage";
import GlobalHelpPage from "./pages/admin/GlobalHelpPage";
import CRMPipeline from "./pages/admin/crm/CRMPipeline";
import CRMLeadDetail from "./pages/admin/crm/CRMLeadDetail";
import CRMScripts from "./pages/admin/crm/CRMScripts";
import CRMDashboard from "./pages/admin/crm/CRMDashboard";
import UnauthorizedPage from "./pages/admin/UnauthorizedPage";
import MeuPerfilPage from "./pages/admin/MeuPerfilPage";
import UsersPage from "./pages/admin/settings/UsersPage";
import UserFormPage from "./pages/admin/settings/UserFormPage";
import SecurityPage from "./pages/admin/settings/SecurityPage";
import { PermissionProvider } from "./contexts/PermissionContext";

import { ThemeProvider } from "next-themes";

const queryClient = new QueryClient();

const App = () => {
  const hostname = window.location.hostname;
  const isAppDomain = hostname.includes('app.acainograu.com.br');
  const isDeliveryDomain = hostname.includes('delivery.acainograu.com.br');
  const isLocal = !isAppDomain && !isDeliveryDomain;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <AppManager />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ErrorBoundary>
              <AuthProvider>
                <PermissionProvider>
                <StoreProvider>
                  <CartProvider>
                    <PrinterProvider>
                      <CopilotGlobalWrapper />
                      <GlobalFranchiseeOrderAlert />
                      <Routes>
                        {/* 🌐 Domain Aware Routing Logic */}
                        
                        {/* Redirecionamento inicial para o domínio APP */}
                        {isAppDomain && (
                          <Route path="/" element={<Navigate to="/admin/hub" replace />} />
                        )}

                        {/* Bloqueio de Admin no domínio Delivery */}
                        {isDeliveryDomain && (
                          <Route path="/admin/*" element={<Navigate to="/" replace />} />
                        )}

                        {/* Client routes - Apenas se NÃO for domínio APP (exceto se for local) */}
                        {(!isAppDomain || isLocal) && (
                          <>
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
                          </>
                        )}

                        {/* Admin routes - Apenas se NÃO for domínio Delivery (exceto se for local) */}
                        {(!isDeliveryDomain || isLocal) && (
                          <>
                            {/* Admin auth routes */}
                      <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
                      <Route path="/admin/login" element={<Login />} />
                      <Route path="/admin/reset-password" element={<ResetPassword />} />
                      <Route path="/admin/update-password" element={<UpdatePasswordPage />} />
                      <Route path="/admin/signup" element={<Signup />} />
                      <Route path="/franchise-request" element={<FranchiseRequest />} />

                      {/* Driver Module */}
                      <Route path="/driver/login" element={<DriverLogin />} />
                      <Route path="/driver/dashboard" element={<DriverDashboard />} />
                      <Route path="/frota/login" element={<MotoristaLogin />} />
                      <Route path="/frota/dashboard" element={<MotoristaDashboard />} />

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
                        path="/admin/hub-preview"
                        element={<HubPreviewPage />}
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
                        path="/admin/frota"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <FrotaPage />
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

                      {/* Franchisee Ordering System */}
                      <Route
                        path="/admin/orders/catalog"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <OrderCatalog />
                          </PrivateRoute>
                        }
                      />
                      {/* CAF — Central de Atendimento ao Franqueado */}
                      <Route path="/admin/caf" element={<Navigate to="/admin/caf/dashboard" replace />} />
                      <Route path="/admin/caf/dashboard" element={
                        <PrivateRoute requiredRole="staff">
                          <AdminLayout><CAFDashboard /></AdminLayout>
                        </PrivateRoute>
                      } />
                      <Route path="/admin/caf/atendimentos" element={
                        <PrivateRoute requiredRole="staff">
                          <AdminLayout><AtendimentosPage /></AdminLayout>
                        </PrivateRoute>
                      } />
                      <Route path="/admin/caf/base-conhecimento" element={
                        <PrivateRoute requiredRole="staff">
                          <AdminLayout><BaseConhecimentoPage /></AdminLayout>
                        </PrivateRoute>
                      } />
                      <Route path="/admin/caf/relatorios" element={
                        <PrivateRoute requiredRole="manager">
                          <AdminLayout><RelatoriosCAFPage /></AdminLayout>
                        </PrivateRoute>
                      } />
                      <Route path="/admin/caf/cadastros" element={
                        <PrivateRoute requiredRole="manager">
                          <AdminLayout><CadastrosCAFPage /></AdminLayout>
                        </PrivateRoute>
                      } />
                      <Route path="/admin/caf/connect" element={
                        <PrivateRoute requiredRole="staff">
                          <AdminLayout><CAFConnectPage /></AdminLayout>
                        </PrivateRoute>
                      } />

                      {/* Agenda Operacional — módulo independente, CAF é só uma origem */}
                      <Route path="/admin/agenda" element={<Navigate to="/admin/agenda/dashboard" replace />} />
                      <Route path="/admin/agenda/dashboard" element={
                        <PrivateRoute requiredRole="staff">
                          <AdminLayout><AgendaDashboardPage /></AdminLayout>
                        </PrivateRoute>
                      } />
                      <Route path="/admin/agenda/calendario" element={
                        <PrivateRoute requiredRole="staff">
                          <AdminLayout><CalendarioAgendaPage /></AdminLayout>
                        </PrivateRoute>
                      } />
                      <Route path="/admin/agenda/minha" element={
                        <PrivateRoute requiredRole="staff">
                          <AdminLayout><MinhaAgendaPage /></AdminLayout>
                        </PrivateRoute>
                      } />
                      <Route path="/admin/agenda/equipe" element={
                        <PrivateRoute requiredRole="staff">
                          <AdminLayout><EquipeAgendaPage /></AdminLayout>
                        </PrivateRoute>
                      } />
                      <Route path="/admin/agenda/compromissos" element={
                        <PrivateRoute requiredRole="staff">
                          <AdminLayout><CompromissosPage /></AdminLayout>
                        </PrivateRoute>
                      } />
                      <Route path="/admin/agenda/relatorios" element={
                        <PrivateRoute requiredRole="staff">
                          <AdminLayout><RelatoriosAgendaPage /></AdminLayout>
                        </PrivateRoute>
                      } />

                      <Route
                        path="/admin/grauzinho"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <GrauzinhoPage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/orders/catalog/:productId"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <FranchiseeProductDetail />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/orders/history"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <OrderHistory />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/orders/:orderId"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <FranchiseeOrderDetails />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/orders/checkout"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <CheckoutPage />
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/orders/management"
                        element={
                          <PrivateRoute requiredRole="staff" requiredPermission="mas.cargas">
                            <AdminLayout>
                              <OrderManagement />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/orders/reports"
                        element={
                          <PrivateRoute requiredRole="staff" requiredPermission="mas.relatorios">
                            <AdminLayout>
                              <OrdersReportsPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/orders/products"
                        element={
                          <PrivateRoute requiredRole="staff" requiredPermission="mas.catalogo">
                            <AdminLayout>
                              <FranchiseeProductsPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />

                      {/* Franchise management */}
                      <Route path="/admin/franchisees" element={
                        <PrivateRoute requiredRole="staff" requiredPermission="mas.franqueados">
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
                      {/* New Stock & Operations Module */}
                      <Route path="/admin/stock" element={<Navigate to="/admin/stock/dashboard" replace />} />
                      <Route
                        path="/admin/stock/dashboard"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <StockDashboardPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/stock/inventory"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <StockInventoryPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/stock/movements"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <StockMovementsPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/stock/cmv"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <StockCMVPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/stock/purchases"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <StockPurchasesPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/stock/counts"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <StockCountsPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/stock/recipes"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <StockRecipesPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/stock/purchase-history"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <AdminLayout>
                              <PurchaseHistoryPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/stock/checklists/admin"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <ChecklistAdminPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/stock/checklists/execution"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <AdminLayout>
                              <ChecklistExecutionPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/stock/checklists/reports"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <AdminLayout>
                              <ChecklistReportsPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/stock/count-groups"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <CountGroupsPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/stock/recurring-counts"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <RecurringCountsPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/stock/count-executions/:id"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <AdminLayout>
                              <RecurringCountExecutionPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/stock/bonificacoes"
                        element={
                          <PrivateRoute requiredRole="staff">
                            <AdminLayout>
                              <BonificacoesPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/stock/balance"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <StockBalancePage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/stock/help"
                        element={<Navigate to="/admin/help" replace />}
                      />
                      <Route
                        path="/admin/help"
                        element={
                          <PrivateRoute>
                            <AdminLayout>
                              <GlobalHelpPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      {/* CRM & Atendimento */}
                      <Route path="/admin/crm" element={<Navigate to="/admin/crm/pipeline" replace />} />
                      <Route
                        path="/admin/crm/pipeline"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout><CRMPipeline /></AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/crm/leads/:id"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout><CRMLeadDetail /></AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/crm/scripts"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout><CRMScripts /></AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/crm/dashboard"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout><CRMDashboard /></AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/unauthorized"
                        element={
                          <PrivateRoute>
                            <AdminLayout>
                              <UnauthorizedPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/meu-perfil"
                        element={
                          <PrivateRoute>
                            <AdminLayout>
                              <MeuPerfilPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/settings/usuarios"
                        element={
                          <PrivateRoute requiredRole="manager" requiredPermission="sis.usuarios">
                            <AdminLayout>
                              <UsersPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/settings/usuarios/novo"
                        element={
                          <PrivateRoute requiredRole="manager" requiredPermission="sis.usuarios" requiredNivel={2}>
                            <AdminLayout>
                              <UserFormPage />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/settings/usuarios/editar/:id"
                        element={
                          <PrivateRoute requiredRole="manager" requiredPermission="sis.usuarios" requiredNivel={3}>
                            <AdminLayout>
                              <UserFormPage />
                            </AdminLayout>
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
                      <Route
                        path="/admin/settings/seguranca"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <SecurityPage />
                            </AdminLayout>
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
                        path="/admin/pdv/caixa/historico"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <HistoricoTurnos />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      <Route
                        path="/admin/pdv/caixa/turno/:id"
                        element={
                          <PrivateRoute requiredRole="manager">
                            <AdminLayout>
                              <DetalheTurno />
                            </AdminLayout>
                          </PrivateRoute>
                        }
                      />
                      {/* Descontinuadas — unificadas na Central de Relatórios (/admin/pdv/relatorios) */}
                      <Route path="/admin/pdv/historico" element={<Navigate to="/admin/pdv/relatorios" replace />} />
                      <Route path="/admin/pdv/extrato" element={<Navigate to="/admin/pdv/relatorios" replace />} />

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
                        path="/admin/loja/dados"
                        element={
                          <PrivateRoute>
                            <AdminLayout>
                              <DadosLojaPage />
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
                    </>
                  )}

                      {/* Pesquisa de satisfação — pública, funciona em todos os domínios */}
                      <Route path="/avaliacao/:token" element={<SatisfacaoPublicaPage />} />

                      {/* Portal do Franqueado — abertura de chamados, acesso por senha */}
                      <Route path="/suporte" element={<PortalFranqueadoPage />} />

                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </PrinterProvider>
                </CartProvider>
              </StoreProvider>
                </PermissionProvider>
            </AuthProvider>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
