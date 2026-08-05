import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { StoreProvider } from "@/contexts/StoreContext";
import { CartProvider } from "@/contexts/CartContext";
import { ProtectedRoute } from "@/components/customer/ProtectedRoute";
import { useCustomerPushNotifications } from "@/hooks/customer/useCustomerPushNotifications";

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
import Auth from "./pages/Auth";
import InfinitePaySuccess from "./pages/InfinitePaySuccess";
import OrderTracking from "./pages/tracking/OrderTracking";

// Raiz do app nativo "Açaí no Grau" (storefront do cliente) — build enxuto
// e separado do GrauOS principal (ver vite.delivery.config.ts /
// index-delivery-app.html), mesmo padrão já usado no app do motorista
// (src/FrotaApp.tsx).
//
// Diferente do Frota, o fluxo de cliente usa Auth/Store/Cart de verdade
// (confirmado por grep: useAuth/useCart em uso extensivo; useStore só em
// LocationState.tsx e Menu.tsx) — por isso esses 3 providers entram aqui,
// diferente do Frota que não precisa de nenhum. PermissionProvider e
// PrinterProvider ficam de fora (zero uso confirmado nas telas de cliente).
//
// As rotas abaixo são hardcoded (não reaproveitam a lógica de
// isAppDomain/isDeliveryDomain/isLocal de src/App.tsx, que decide as rotas
// por window.location.hostname — dentro do WebView isso cairia no ramo
// "isLocal" e acabaria registrando também as rotas /admin/* por engano).
const queryClient = new QueryClient();

// Só chama o hook de registro de push (precisa estar dentro de AuthProvider
// + BrowserRouter pra usar useAuth/useNavigate) — sem UI própria.
function PushNotificationsRegistrar() {
  useCustomerPushNotifications();
  return null;
}

export default function DeliveryApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <StoreProvider>
                <CartProvider>
                  <PushNotificationsRegistrar />
                  <Routes>
                    <Route path="/" element={<LocationState />} />
                    <Route path="/location-city" element={<LocationCity />} />
                    <Route path="/searching" element={<Searching />} />
                    <Route path="/store-result" element={<StoreResult />} />
                    <Route path="/stores" element={<Stores />} />
                    <Route path="/menu" element={<Menu />} />
                    <Route path="/product/:id" element={<ProductDetail />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/install" element={<Install />} />
                    <Route path="/auth" element={<Auth />} />

                    {/* Rotas protegidas do cliente */}
                    <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
                    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                    <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                    <Route path="/order-details/:orderId" element={<ProtectedRoute><OrderDetails /></ProtectedRoute>} />
                    <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                    {/* InfinitePay fica fora do escopo nativo por enquanto (já
                        inativo hoje mesmo na web — rota mantida por paridade). */}
                    <Route path="/checkout/infinitepay/success" element={<ProtectedRoute><InfinitePaySuccess /></ProtectedRoute>} />
                    <Route path="/order-confirmation/:orderId" element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />

                    {/* Rastreamento — rota pública (vem de e-mail/WhatsApp) */}
                    <Route path="/tracking/:orderId" element={<OrderTracking />} />

                    {/* Loja do franqueado na raiz: /gurupi. Fica por último por
                        clareza — o React Router prioriza as rotas estáticas
                        acima independentemente da ordem. Slugs que colidiriam
                        com elas são bloqueados no cadastro (ver lib/reservedSlugs).
                        Slug inexistente cai no "Loja não encontrada" do StoreMenu. */}
                    <Route path="/:slug" element={<StoreMenu />} />
                    <Route path="/:slug/categories" element={<Categories />} />
                  </Routes>
                </CartProvider>
              </StoreProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
